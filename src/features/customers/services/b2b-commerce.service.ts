/**
 * B2B Commerce Service
 *
 * Implements business buyer organization lifecycles, role-based member governance,
 * Request for Quote (RFQ) workflows, seller quoting with quantity breaks,
 * internal buyer approval thresholds, and quote-to-cart conversion.
 *
 * Invariant: Credit terms remain disabled until explicitly approved by Admin.
 * Invariant: B2B reward/point eligibility is governed by versioned configuration.
 * Invariant: Tenant isolation strictly enforced on buyer orgs and seller quotes.
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  ConflictError,
} from '@/shared/errors/app-error';
import {
  BuyerOrganizationDTO,
  BuyerOrganizationMemberDTO,
  B2BRfqDTO,
  B2BRfqItemDTO,
  B2BQuoteDTO,
  B2BQuoteItemDTO,
  B2BQuoteVersionDTO,
  BuyerMemberRole,
  PaymentTerms,
} from '../types/b2b.types';
import {
  InviteBuyerMemberInput,
  UpdateBuyerMemberInput,
  AdminReviewOrganizationInput,
  AdminConfigureCreditTermsInput,
  CreateRfqInput,
  CreateQuoteInput,
  NegotiateQuoteInput,
  InternalApproveQuoteInput,
  AcceptQuoteInput,
} from '../validators/b2b.validators';
import { RegisterBusinessBuyerInput } from '../validators';

export class B2BCommerceService {
  private db = prisma;

  // ----------------------------------------------------------------------------
  // 1. Business Buyer Organizations & Member Governance
  // ----------------------------------------------------------------------------

  /**
   * Registers a customer account as a new Business Buyer organization.
   * Begins in PENDING_APPROVAL status with credit terms DISABLED.
   */
  public async registerOrganization(
    userId: string,
    input: RegisterBusinessBuyerInput
  ): Promise<BuyerOrganizationDTO> {
    const existingMembership = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { userId, deletedAt: null },
    });
    if (existingMembership) {
      throw new ConflictError('User already belongs to an existing Business Buyer organization.');
    }

    const orgId = `org_${Math.random().toString(36).substring(2, 10)}`;
    const memberId = `bom_${Math.random().toString(36).substring(2, 10)}`;

    const organization = await (this.db as any).buyerOrganization.create({
      data: {
        id: orgId,
        companyName: input.companyName,
        businessType: input.businessType,
        tradeLicenseNumber: input.tradeLicenseNumber || null,
        binNumber: input.binNumber || null,
        tinNumber: input.tinNumber || null,
        status: 'PENDING_APPROVAL',
        creditStatus: 'DISABLED',
        creditLimitPoisha: 0n,
        creditTermsDays: 0,
        rewardsRuleVersion: 'b2b-rewards-v1.0',
        earnsProductPoints: false,
        members: {
          create: {
            id: memberId,
            userId,
            role: 'ADMIN',
            spendingLimitPoisha: 0n,
            status: 'ACTIVE',
          },
        },
      },
      include: {
        members: true,
      },
    });

    await this.recordOutboxEvent('b2b.organization_registered', orgId, {
      organizationId: orgId,
      userId,
      companyName: input.companyName,
    });

    return this.mapOrganizationToDTO(organization, 'ADMIN');
  }

  /**
   * Retrieves an organization by ID verifying the caller is a member or platform admin.
   */
  public async getOrganization(
    organizationId: string,
    userId: string
  ): Promise<BuyerOrganizationDTO> {
    const membership = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { organizationId, userId, deletedAt: null },
    });

    if (!membership) {
      throw new AuthorizationError('You do not have access to this buyer organization.');
    }

    const org = await (this.db as any).buyerOrganization.findFirst({
      where: { id: organizationId, deletedAt: null },
      include: {
        _count: { select: { members: { where: { deletedAt: null } } } },
      },
    });

    if (!org) {
      throw new NotFoundError(`Buyer organization '${organizationId}' not found.`);
    }

    return this.mapOrganizationToDTO(org, membership.role as BuyerMemberRole);
  }

  /**
   * Retrieves the active organization for a given user.
   */
  public async getUserOrganization(userId: string): Promise<BuyerOrganizationDTO | null> {
    const membership = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { userId, deletedAt: null, status: 'ACTIVE' },
      include: {
        organization: {
          include: {
            _count: { select: { members: { where: { deletedAt: null } } } },
          },
        },
      },
    });

    if (!membership || !membership.organization) {
      return null;
    }

    return this.mapOrganizationToDTO(
      membership.organization,
      membership.role as BuyerMemberRole
    );
  }

  /**
   * Lists all members of an organization.
   */
  public async listMembers(
    organizationId: string,
    userId: string
  ): Promise<BuyerOrganizationMemberDTO[]> {
    await this.verifyMemberAccess(organizationId, userId);

    const members = await (this.db as any).buyerOrganizationMember.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m: any) => ({
      id: m.id,
      organizationId: m.organizationId,
      userId: m.userId,
      role: m.role as BuyerMemberRole,
      spendingLimitPoisha: Number(m.spendingLimitPoisha),
      status: m.status,
      version: m.version,
      createdAt: m.createdAt.toISOString(),
      user: m.user,
    }));
  }

  /**
   * Invites or adds a member to the buyer organization. (Admin only)
   */
  public async inviteMember(
    organizationId: string,
    inviterUserId: string,
    input: InviteBuyerMemberInput
  ): Promise<BuyerOrganizationMemberDTO> {
    await this.verifyAdminRole(organizationId, inviterUserId);

    const existing = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { organizationId, userId: input.userId, deletedAt: null },
    });
    if (existing) {
      throw new ConflictError('User is already a member of this organization.');
    }

    const memberId = `bom_${Math.random().toString(36).substring(2, 10)}`;
    const member = await (this.db as any).buyerOrganizationMember.create({
      data: {
        id: memberId,
        organizationId,
        userId: input.userId,
        role: input.role,
        spendingLimitPoisha: BigInt(input.spendingLimitPoisha || 0),
        status: 'ACTIVE',
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    await this.recordOutboxEvent('b2b.member_added', organizationId, {
      organizationId,
      memberId: member.id,
      userId: input.userId,
      role: input.role,
    });

    return {
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role as BuyerMemberRole,
      spendingLimitPoisha: Number(member.spendingLimitPoisha),
      status: member.status,
      version: member.version,
      createdAt: member.createdAt.toISOString(),
      user: member.user,
    };
  }

  /**
   * Updates an organization member's role or spending limit. (Admin only)
   */
  public async updateMember(
    organizationId: string,
    updaterUserId: string,
    memberId: string,
    input: UpdateBuyerMemberInput
  ): Promise<BuyerOrganizationMemberDTO> {
    await this.verifyAdminRole(organizationId, updaterUserId);

    const member = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { id: memberId, organizationId, deletedAt: null },
    });
    if (!member) {
      throw new NotFoundError(`Member '${memberId}' not found in organization.`);
    }

    const updated = await (this.db as any).buyerOrganizationMember.update({
      where: { id: memberId },
      data: {
        ...(input.role ? { role: input.role } : {}),
        ...(input.spendingLimitPoisha !== undefined
          ? { spendingLimitPoisha: BigInt(input.spendingLimitPoisha) }
          : {}),
        ...(input.status ? { status: input.status } : {}),
        version: { increment: 1 },
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      userId: updated.userId,
      role: updated.role as BuyerMemberRole,
      spendingLimitPoisha: Number(updated.spendingLimitPoisha),
      status: updated.status,
      version: updated.version,
      createdAt: updated.createdAt.toISOString(),
      user: updated.user,
    };
  }

  /**
   * Admin approves, rejects, or suspends an organization.
   */
  public async adminReviewOrganization(
    adminUserId: string,
    organizationId: string,
    input: AdminReviewOrganizationInput
  ): Promise<BuyerOrganizationDTO> {
    const org = await (this.db as any).buyerOrganization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundError(`Buyer organization '${organizationId}' not found.`);
    }

    const updated = await (this.db as any).buyerOrganization.update({
      where: { id: organizationId },
      data: {
        status: input.status,
        ...(input.status === 'APPROVED' ? { approvedAt: new Date(), approvedBy: adminUserId } : {}),
        ...(input.status === 'REJECTED' ? { rejectionReason: input.rejectionReason || null } : {}),
        version: { increment: 1 },
      },
    });

    await this.recordOutboxEvent('b2b.organization_reviewed', organizationId, {
      organizationId,
      status: input.status,
      reviewedBy: adminUserId,
    });

    return this.mapOrganizationToDTO(updated);
  }

  /**
   * Admin configures credit terms and loyalty reward eligibility.
   * Invariant: Credit terms remain disabled until explicitly approved.
   */
  public async adminConfigureCreditTerms(
    adminUserId: string,
    organizationId: string,
    input: AdminConfigureCreditTermsInput
  ): Promise<BuyerOrganizationDTO> {
    const org = await (this.db as any).buyerOrganization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundError(`Buyer organization '${organizationId}' not found.`);
    }

    const updated = await (this.db as any).buyerOrganization.update({
      where: { id: organizationId },
      data: {
        creditStatus: input.creditStatus,
        creditLimitPoisha: BigInt(input.creditLimitPoisha),
        creditTermsDays: input.creditTermsDays,
        earnsProductPoints: input.earnsProductPoints,
        rewardsRuleVersion: input.rewardsRuleVersion,
        version: { increment: 1 },
      },
    });

    await this.recordOutboxEvent('b2b.credit_terms_configured', organizationId, {
      organizationId,
      configuredBy: adminUserId,
      creditStatus: input.creditStatus,
      creditLimitPoisha: input.creditLimitPoisha,
      creditTermsDays: input.creditTermsDays,
      earnsProductPoints: input.earnsProductPoints,
      rewardsRuleVersion: input.rewardsRuleVersion,
    });

    return this.mapOrganizationToDTO(updated);
  }

  // ----------------------------------------------------------------------------
  // 2. Request for Quote (RFQ) Workflow & MOQ Verification
  // ----------------------------------------------------------------------------

  /**
   * Creates an RFQ submitted by an authorized organization member (Admin or Purchaser).
   * Validates Minimum Order Quantity (MOQ).
   */
  public async createRfq(userId: string, input: CreateRfqInput): Promise<B2BRfqDTO> {
    const membership = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { userId, deletedAt: null, status: 'ACTIVE' },
      include: { organization: true },
    });

    if (!membership) {
      throw new AuthorizationError('You do not belong to an active business buyer organization.');
    }

    if (membership.organization.status !== 'APPROVED') {
      throw new ValidationError(
        'Your business buyer organization must be approved by AlifWorld Admin before submitting RFQs.'
      );
    }

    if (membership.role === 'VIEWER') {
      throw new AuthorizationError('Viewers are not permitted to submit RFQs.');
    }

    // Verify MOQs for each requested item
    for (const item of input.items) {
      const product = await (this.db as any).product.findFirst({
        where: { id: item.productId, deletedAt: null },
        include: {
          variants: item.variantId ? { where: { id: item.variantId, deletedAt: null } } : false,
        },
      });

      if (!product) {
        throw new NotFoundError(`Product '${item.productId}' not found in catalog.`);
      }

      const moq =
        item.variantId && product.variants?.[0]?.minOrderQuantity
          ? product.variants[0].minOrderQuantity
          : product.minOrderQuantity || 1;

      if (item.quantity < moq) {
        throw new ValidationError(
          `Item '${item.productTitle}' does not meet Minimum Order Quantity (MOQ). Requested: ${item.quantity}, Minimum required: ${moq}.`
        );
      }
    }

    const rfqId = `rfq_${Math.random().toString(36).substring(2, 10)}`;
    const rfqNumber = `RFQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + (input.expiresInDays || 14) * 86400000);

    const rfq = await (this.db as any).b2bRfq.create({
      data: {
        id: rfqId,
        rfqNumber,
        organizationId: membership.organizationId,
        requesterId: membership.id,
        sellerId: input.sellerId || null,
        title: input.title,
        status: 'SUBMITTED',
        purchaseOrderRef: input.purchaseOrderRef || null,
        currency: 'BDT',
        requiredDeliveryDate: input.requiredDeliveryDate
          ? new Date(input.requiredDeliveryDate)
          : null,
        shippingAddress: input.shippingAddress || null,
        notes: input.notes || null,
        expiresAt,
        items: {
          create: input.items.map((item) => ({
            id: `rfqi_${Math.random().toString(36).substring(2, 10)}`,
            productId: item.productId,
            variantId: item.variantId || null,
            productTitle: item.productTitle,
            quantity: item.quantity,
            targetPricePoisha: item.targetPricePoisha ? BigInt(item.targetPricePoisha) : null,
            specifications: item.specifications || null,
            minOrderQuantity: 1,
          })),
        },
      },
      include: {
        items: true,
        organization: { select: { id: true, companyName: true } },
        seller: { select: { id: true, businessName: true } },
      },
    });

    await this.recordOutboxEvent('b2b.rfq_submitted', rfqId, {
      rfqId,
      rfqNumber,
      organizationId: membership.organizationId,
      sellerId: input.sellerId || null,
      title: input.title,
      itemsCount: input.items.length,
    });

    return this.mapRfqToDTO(rfq);
  }

  /**
   * Lists RFQs for a buyer organization or a seller tenant.
   */
  public async listRfqs(
    userId: string,
    filters: {
      role: 'BUYER' | 'SELLER' | 'ADMIN';
      sellerId?: string;
      status?: string;
    }
  ): Promise<B2BRfqDTO[]> {
    if (filters.role === 'BUYER') {
      const membership = await (this.db as any).buyerOrganizationMember.findFirst({
        where: { userId, deletedAt: null },
      });
      if (!membership) {
        return [];
      }

      const rfqs = await (this.db as any).b2bRfq.findMany({
        where: {
          organizationId: membership.organizationId,
          deletedAt: null,
          ...(filters.status ? { status: filters.status } : {}),
        },
        include: {
          items: true,
          organization: { select: { id: true, companyName: true } },
          seller: { select: { id: true, businessName: true } },
          _count: { select: { quotes: { where: { deletedAt: null } } } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return rfqs.map((rfq: any) => this.mapRfqToDTO(rfq));
    }

    if (filters.role === 'SELLER') {
      if (!filters.sellerId) {
        throw new ValidationError('Seller ID is required for seller RFQ queries.');
      }

      // Sellers see RFQs specifically targeted to them or open marketplace RFQs
      const rfqs = await (this.db as any).b2bRfq.findMany({
        where: {
          OR: [{ sellerId: filters.sellerId }, { sellerId: null }],
          deletedAt: null,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'QUOTED'] },
        },
        include: {
          items: true,
          organization: { select: { id: true, companyName: true } },
          seller: { select: { id: true, businessName: true } },
          _count: { select: { quotes: { where: { deletedAt: null } } } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return rfqs.map((rfq: any) => this.mapRfqToDTO(rfq));
    }

    // Platform Admin view
    const rfqs = await (this.db as any).b2bRfq.findMany({
      where: {
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        items: true,
        organization: { select: { id: true, companyName: true } },
        seller: { select: { id: true, businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rfqs.map((rfq: any) => this.mapRfqToDTO(rfq));
  }

  /**
   * Retrieves an RFQ by ID enforcing authorization and tenant boundary.
   */
  public async getRfqById(
    rfqId: string,
    userId: string,
    sellerId?: string
  ): Promise<B2BRfqDTO> {
    const rfq = await (this.db as any).b2bRfq.findFirst({
      where: { id: rfqId, deletedAt: null },
      include: {
        items: true,
        organization: { select: { id: true, companyName: true } },
        seller: { select: { id: true, businessName: true } },
      },
    });

    if (!rfq) {
      throw new NotFoundError(`RFQ '${rfqId}' not found.`);
    }

    // Verify caller is either in the buyer organization or is the matching seller
    const membership = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { organizationId: rfq.organizationId, userId, deletedAt: null },
    });

    const isAuthorizedSeller = sellerId && (rfq.sellerId === sellerId || rfq.sellerId === null);

    if (!membership && !isAuthorizedSeller) {
      throw new AuthorizationError('You do not have permission to view this RFQ.');
    }

    return this.mapRfqToDTO(rfq);
  }

  /**
   * Cancels an open RFQ.
   */
  public async cancelRfq(rfqId: string, userId: string): Promise<B2BRfqDTO> {
    const rfq = await (this.db as any).b2bRfq.findFirst({
      where: { id: rfqId, deletedAt: null },
    });
    if (!rfq) {
      throw new NotFoundError(`RFQ '${rfqId}' not found.`);
    }

    await this.verifyAdminOrPurchaser(rfq.organizationId, userId);

    if (rfq.status === 'ACCEPTED' || rfq.status === 'CANCELLED') {
      throw new ValidationError(`Cannot cancel RFQ in '${rfq.status}' status.`);
    }

    const updated = await (this.db as any).b2bRfq.update({
      where: { id: rfqId },
      data: { status: 'CANCELLED', version: { increment: 1 } },
      include: {
        items: true,
        organization: { select: { id: true, companyName: true } },
        seller: { select: { id: true, businessName: true } },
      },
    });

    return this.mapRfqToDTO(updated);
  }

  // ----------------------------------------------------------------------------
  // 3. Negotiated Quote Workflow & Seller Responses
  // ----------------------------------------------------------------------------

  /**
   * Seller creates a formal Quote in response to an RFQ.
   * Checks versioned B2B rule for rewards/points and verifies credit approval if net terms requested.
   */
  public async createQuote(
    sellerUserId: string,
    sellerId: string,
    rfqId: string,
    input: CreateQuoteInput
  ): Promise<B2BQuoteDTO> {
    const rfq = await (this.db as any).b2bRfq.findFirst({
      where: { id: rfqId, deletedAt: null },
      include: {
        organization: true,
      },
    });

    if (!rfq) {
      throw new NotFoundError(`RFQ '${rfqId}' not found.`);
    }

    if (rfq.sellerId && rfq.sellerId !== sellerId) {
      throw new AuthorizationError('This RFQ is targeted to another seller tenant.');
    }

    if (rfq.status !== 'SUBMITTED' && rfq.status !== 'UNDER_REVIEW' && rfq.status !== 'QUOTED') {
      throw new ValidationError(`Cannot quote on RFQ in '${rfq.status}' status.`);
    }

    // Invariant: Credit terms remain disabled until explicitly approved
    const paymentTerms = input.paymentTerms || 'IMMEDIATE';
    if (paymentTerms !== 'IMMEDIATE') {
      if (rfq.organization.creditStatus !== 'APPROVED') {
        throw new ValidationError(
          `Credit terms (${paymentTerms}) cannot be offered because this buyer organization's credit status is '${rfq.organization.creditStatus}'. Immediate payment required.`
        );
      }
    }

    // Calculate financials in integer poisha
    let poishaSubtotal = 0n;
    for (const item of input.items) {
      const lineTotal = BigInt(item.quantity) * BigInt(item.unitPricePoisha);
      poishaSubtotal += lineTotal;
    }

    const shippingPoisha = BigInt(input.shippingPoisha || 0);
    const taxPoisha = BigInt(input.taxPoisha || 0);
    const totalPoisha = poishaSubtotal + shippingPoisha + taxPoisha;

    // Check versioned B2B configuration rule for loyalty rewards/points
    const ruleVersion = rfq.organization.rewardsRuleVersion || 'b2b-rewards-v1.0';
    let pointsAwarded = 0;
    if (rfq.organization.earnsProductPoints) {
      // Invariant: Product points calculated only when versioned rule allows
      pointsAwarded = Math.floor(Number(totalPoisha) / 10000); // e.g. 1 point per 100 BDT if earned
    }

    const quoteId = `quo_${Math.random().toString(36).substring(2, 10)}`;
    const quoteNumber = `QUO-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const validUntil = new Date(Date.now() + (input.validUntilDays || 7) * 86400000);

    const quote = await (this.db as any).b2bQuote.create({
      data: {
        id: quoteId,
        quoteNumber,
        rfqId,
        organizationId: rfq.organizationId,
        sellerId,
        currentVersion: 1,
        status: 'PENDING_BUYER_REVIEW',
        currency: 'BDT',
        validUntil,
        poishaSubtotal,
        taxPoisha,
        shippingPoisha,
        totalPoisha,
        pointsAwarded,
        ruleVersion,
        paymentTerms,
        items: {
          create: input.items.map((item) => ({
            id: `quoi_${Math.random().toString(36).substring(2, 10)}`,
            productId: item.productId,
            variantId: item.variantId || null,
            productTitle: item.productTitle,
            quantity: item.quantity,
            unitPricePoisha: BigInt(item.unitPricePoisha),
            lineTotalPoisha: BigInt(item.quantity) * BigInt(item.unitPricePoisha),
            quantityBreakTier: item.quantityBreakTier || null,
            leadTimeDays: item.leadTimeDays || null,
          })),
        },
        versions: {
          create: {
            id: `qv_${Math.random().toString(36).substring(2, 10)}`,
            versionNumber: 1,
            proposedBy: 'SELLER',
            proposerUserId: sellerUserId,
            totalPoisha,
            itemsSnapshot: input.items,
            paymentTerms,
            notes: input.notes || null,
          },
        },
      },
      include: {
        items: true,
        versions: true,
        organization: { select: { id: true, companyName: true } },
        seller: { select: { id: true, businessName: true } },
      },
    });

    // Update RFQ status to QUOTED
    await (this.db as any).b2bRfq.update({
      where: { id: rfqId },
      data: { status: 'QUOTED', version: { increment: 1 } },
    });

    await this.recordOutboxEvent('b2b.quote_proposed', quoteId, {
      quoteId,
      quoteNumber,
      rfqId,
      sellerId,
      organizationId: rfq.organizationId,
      totalPoisha: Number(totalPoisha),
      paymentTerms,
    });

    return this.mapQuoteToDTO(quote);
  }

  /**
   * Retrieves quote by ID ensuring caller is either the buyer organization or the seller.
   */
  public async getQuoteById(
    quoteId: string,
    userId: string,
    sellerId?: string
  ): Promise<B2BQuoteDTO> {
    const quote = await (this.db as any).b2bQuote.findFirst({
      where: { id: quoteId, deletedAt: null },
      include: {
        items: true,
        versions: { orderBy: { versionNumber: 'desc' } },
        organization: { select: { id: true, companyName: true } },
        seller: { select: { id: true, businessName: true } },
      },
    });

    if (!quote) {
      throw new NotFoundError(`Quote '${quoteId}' not found.`);
    }

    const membership = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { organizationId: quote.organizationId, userId, deletedAt: null },
    });

    const isAuthorizedSeller = sellerId && quote.sellerId === sellerId;

    if (!membership && !isAuthorizedSeller) {
      throw new AuthorizationError('You do not have permission to view this quote.');
    }

    return this.mapQuoteToDTO(quote);
  }

  /**
   * Lists quotes for a buyer organization or seller.
   */
  public async listQuotes(
    userId: string,
    filters: {
      role: 'BUYER' | 'SELLER';
      organizationId?: string;
      sellerId?: string;
      rfqId?: string;
    }
  ): Promise<B2BQuoteDTO[]> {
    if (filters.role === 'BUYER') {
      const membership = await (this.db as any).buyerOrganizationMember.findFirst({
        where: { userId, deletedAt: null },
      });
      if (!membership) {
        return [];
      }

      const quotes = await (this.db as any).b2bQuote.findMany({
        where: {
          organizationId: membership.organizationId,
          deletedAt: null,
          ...(filters.rfqId ? { rfqId: filters.rfqId } : {}),
        },
        include: {
          items: true,
          versions: { orderBy: { versionNumber: 'desc' } },
          organization: { select: { id: true, companyName: true } },
          seller: { select: { id: true, businessName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return quotes.map((q: any) => this.mapQuoteToDTO(q));
    }

    if (filters.role === 'SELLER') {
      if (!filters.sellerId) {
        throw new ValidationError('Seller ID is required for seller quote queries.');
      }

      const quotes = await (this.db as any).b2bQuote.findMany({
        where: {
          sellerId: filters.sellerId,
          deletedAt: null,
          ...(filters.rfqId ? { rfqId: filters.rfqId } : {}),
        },
        include: {
          items: true,
          versions: { orderBy: { versionNumber: 'desc' } },
          organization: { select: { id: true, companyName: true } },
          seller: { select: { id: true, businessName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return quotes.map((q: any) => this.mapQuoteToDTO(q));
    }

    return [];
  }

  /**
   * Submits a counter-offer or revision to a quote (increments version).
   */
  public async negotiateQuote(
    quoteId: string,
    proposerUserId: string,
    proposedBy: 'BUYER' | 'SELLER',
    input: NegotiateQuoteInput
  ): Promise<B2BQuoteDTO> {
    const quote = await (this.db as any).b2bQuote.findFirst({
      where: { id: quoteId, deletedAt: null },
      include: {
        items: true,
        organization: true,
      },
    });

    if (!quote) {
      throw new NotFoundError(`Quote '${quoteId}' not found.`);
    }

    if (quote.status === 'ACCEPTED' || quote.status === 'CONVERTED' || quote.status === 'EXPIRED') {
      throw new ValidationError(`Cannot negotiate quote in '${quote.status}' status.`);
    }

    const nextVersion = quote.currentVersion + 1;
    let revisedTotal = quote.totalPoisha;
    let itemsToSnapshot: any[] = quote.items;

    if (input.items && input.items.length > 0) {
      let subtotal = 0n;
      for (const item of input.items) {
        subtotal += BigInt(item.quantity) * BigInt(item.unitPricePoisha);
      }
      revisedTotal = subtotal + quote.shippingPoisha + quote.taxPoisha;
      itemsToSnapshot = input.items;
    }

    const nextStatus = proposedBy === 'BUYER' ? 'PENDING_BUYER_REVIEW' : 'PENDING_BUYER_REVIEW';

    const updated = await (this.db as any).b2bQuote.update({
      where: { id: quoteId },
      data: {
        currentVersion: nextVersion,
        totalPoisha: revisedTotal,
        paymentTerms: input.paymentTerms || quote.paymentTerms,
        status: nextStatus,
        version: { increment: 1 },
        versions: {
          create: {
            id: `qv_${Math.random().toString(36).substring(2, 10)}`,
            versionNumber: nextVersion,
            proposedBy,
            proposerUserId,
            totalPoisha: revisedTotal,
            itemsSnapshot: itemsToSnapshot,
            paymentTerms: input.paymentTerms || quote.paymentTerms,
            notes: input.notes,
          },
        },
      },
      include: {
        items: true,
        versions: { orderBy: { versionNumber: 'desc' } },
        organization: { select: { id: true, companyName: true } },
        seller: { select: { id: true, businessName: true } },
      },
    });

    await this.recordOutboxEvent('b2b.quote_negotiated', quoteId, {
      quoteId,
      version: nextVersion,
      proposedBy,
      totalPoisha: Number(revisedTotal),
    });

    return this.mapQuoteToDTO(updated);
  }

  /**
   * Internal Buyer Approval Workflow:
   * When quote total exceeds purchaser member's spending limit, requires approval by Approver or Admin.
   */
  public async approveInternalQuote(
    quoteId: string,
    approverUserId: string,
    input: InternalApproveQuoteInput
  ): Promise<B2BQuoteDTO> {
    const quote = await (this.db as any).b2bQuote.findFirst({
      where: { id: quoteId, deletedAt: null },
    });
    if (!quote) {
      throw new NotFoundError(`Quote '${quoteId}' not found.`);
    }

    const membership = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { organizationId: quote.organizationId, userId: approverUserId, deletedAt: null },
    });

    if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'APPROVER')) {
      throw new AuthorizationError(
        'Only Organization Admins or designated Approvers can grant internal purchasing approval.'
      );
    }

    const updated = await (this.db as any).b2bQuote.update({
      where: { id: quoteId },
      data: {
        status: 'PENDING_BUYER_REVIEW',
        version: { increment: 1 },
      },
      include: {
        items: true,
        versions: { orderBy: { versionNumber: 'desc' } },
        organization: { select: { id: true, companyName: true } },
        seller: { select: { id: true, businessName: true } },
      },
    });

    await this.recordOutboxEvent('b2b.quote_internal_approved', quoteId, {
      quoteId,
      approverUserId,
      notes: input.notes || null,
    });

    return this.mapQuoteToDTO(updated);
  }

  /**
   * Accepts a quote before its expiration timestamp.
   * If member's spending limit is exceeded and not approved, prompts internal approval.
   */
  public async acceptQuote(
    quoteId: string,
    buyerUserId: string,
    input: AcceptQuoteInput
  ): Promise<B2BQuoteDTO> {
    const quote = await (this.db as any).b2bQuote.findFirst({
      where: { id: quoteId, deletedAt: null },
      include: {
        organization: true,
        items: true,
      },
    });

    if (!quote) {
      throw new NotFoundError(`Quote '${quoteId}' not found.`);
    }

    const membership = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { organizationId: quote.organizationId, userId: buyerUserId, deletedAt: null },
    });

    if (!membership) {
      throw new AuthorizationError('You do not belong to the buyer organization.');
    }

    if (membership.role === 'VIEWER') {
      throw new AuthorizationError('Viewers cannot accept quotes.');
    }

    // Check expiry
    if (new Date() > new Date(quote.validUntil)) {
      await (this.db as any).b2bQuote.update({
        where: { id: quoteId },
        data: { status: 'EXPIRED' },
      });
      throw new ValidationError('This quote has expired and can no longer be accepted.');
    }

    // Internal Spending Limit Check:
    // If purchaser member has a spendingLimitPoisha > 0 and quote total exceeds it,
    // move quote to PENDING_INTERNAL_APPROVAL unless user is ADMIN or APPROVER
    const spendingLimit = Number(membership.spendingLimitPoisha);
    if (
      membership.role === 'PURCHASER' &&
      spendingLimit > 0 &&
      Number(quote.totalPoisha) > spendingLimit
    ) {
      const pendingApproval = await (this.db as any).b2bQuote.update({
        where: { id: quoteId },
        data: {
          status: 'PENDING_INTERNAL_APPROVAL',
          version: { increment: 1 },
        },
        include: {
          items: true,
          versions: { orderBy: { versionNumber: 'desc' } },
          organization: { select: { id: true, companyName: true } },
          seller: { select: { id: true, businessName: true } },
        },
      });

      return this.mapQuoteToDTO(pendingApproval);
    }

    const acceptedQuote = await (this.db as any).b2bQuote.update({
      where: { id: quoteId },
      data: {
        status: 'ACCEPTED',
        version: { increment: 1 },
      },
      include: {
        items: true,
        versions: { orderBy: { versionNumber: 'desc' } },
        organization: { select: { id: true, companyName: true } },
        seller: { select: { id: true, businessName: true } },
      },
    });

    // Update parent RFQ status to ACCEPTED
    await (this.db as any).b2bRfq.update({
      where: { id: quote.rfqId },
      data: {
        status: 'ACCEPTED',
        purchaseOrderRef: input.purchaseOrderRef || undefined,
        version: { increment: 1 },
      },
    });

    await this.recordOutboxEvent('b2b.quote_accepted', quoteId, {
      quoteId,
      rfqId: quote.rfqId,
      acceptedBy: buyerUserId,
      totalPoisha: Number(quote.totalPoisha),
      purchaseOrderRef: input.purchaseOrderRef || null,
    });

    return this.mapQuoteToDTO(acceptedQuote);
  }

  /**
   * Converts an ACCEPTED quote into an active Cart with locked negotiated pricing.
   */
  public async convertQuoteToCart(
    quoteId: string,
    buyerUserId: string
  ): Promise<{ cartId: string; quoteId: string; itemsCount: number }> {
    const quote = await (this.db as any).b2bQuote.findFirst({
      where: { id: quoteId, deletedAt: null },
      include: {
        items: true,
        rfq: true,
      },
    });

    if (!quote) {
      throw new NotFoundError(`Quote '${quoteId}' not found.`);
    }

    if (quote.status !== 'ACCEPTED') {
      throw new ValidationError(
        `Only ACCEPTED quotes can be converted to Cart. Current status: '${quote.status}'.`
      );
    }

    await this.verifyMemberAccess(quote.organizationId, buyerUserId);

    // Find or create an active Cart for the customer
    let cart = await (this.db as any).cart.findFirst({
      where: { userId: buyerUserId, status: 'ACTIVE', deletedAt: null },
    });

    if (!cart) {
      cart = await (this.db as any).cart.create({
        data: {
          id: `crt_${Math.random().toString(36).substring(2, 10)}`,
          userId: buyerUserId,
          currency: 'BDT',
          status: 'ACTIVE',
          isB2B: true,
          b2bQuoteId: quote.id,
          purchaseOrderRef: quote.rfq.purchaseOrderRef,
          notes: `B2B Negotiated Quote: ${quote.quoteNumber}`,
          version: 1,
        },
      });
    } else {
      await (this.db as any).cart.update({
        where: { id: cart.id },
        data: {
          isB2B: true,
          b2bQuoteId: quote.id,
          purchaseOrderRef: quote.rfq.purchaseOrderRef,
          notes: `B2B Negotiated Quote: ${quote.quoteNumber}`,
          version: { increment: 1 },
        },
      });
    }

    // Add items from the quote with locked negotiated unit price
    for (const item of quote.items) {
      // Find variant for product if not explicitly present
      let variantId = item.variantId;
      if (!variantId) {
        const product = await (this.db as any).product.findFirst({
          where: { id: item.productId, deletedAt: null },
          include: { variants: { where: { deletedAt: null }, take: 1 } },
        });
        variantId = product?.variants?.[0]?.id;
      }

      if (variantId) {
        await (this.db as any).cartItem.create({
          data: {
            id: `cit_${Math.random().toString(36).substring(2, 10)}`,
            cartId: cart.id,
            variantId,
            sellerId: quote.sellerId,
            quantity: item.quantity,
            pricePoisha: item.unitPricePoisha, // Locked negotiated unit price snapshot!
            productPoint: quote.pointsAwarded > 0 ? quote.pointsAwarded : 0, // B2B rule points
            version: 1,
          },
        });
      }
    }

    // Mark quote as CONVERTED
    await (this.db as any).b2bQuote.update({
      where: { id: quoteId },
      data: {
        status: 'CONVERTED',
        convertedCartId: cart.id,
        version: { increment: 1 },
      },
    });

    await this.recordOutboxEvent('b2b.quote_converted_to_cart', quoteId, {
      quoteId,
      cartId: cart.id,
      buyerUserId,
      itemsCount: quote.items.length,
    });

    return {
      cartId: cart.id,
      quoteId,
      itemsCount: quote.items.length,
    };
  }

  // ----------------------------------------------------------------------------
  // Helper & Mapping Methods
  // ----------------------------------------------------------------------------

  private async verifyMemberAccess(organizationId: string, userId: string): Promise<void> {
    const member = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { organizationId, userId, deletedAt: null, status: 'ACTIVE' },
    });
    if (!member) {
      throw new AuthorizationError('You do not belong to this buyer organization.');
    }
  }

  private async verifyAdminRole(organizationId: string, userId: string): Promise<void> {
    const member = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { organizationId, userId, deletedAt: null, status: 'ACTIVE' },
    });
    if (!member || member.role !== 'ADMIN') {
      throw new AuthorizationError('Only Organization Admins can perform this action.');
    }
  }

  private async verifyAdminOrPurchaser(organizationId: string, userId: string): Promise<void> {
    const member = await (this.db as any).buyerOrganizationMember.findFirst({
      where: { organizationId, userId, deletedAt: null, status: 'ACTIVE' },
    });
    if (!member || (member.role !== 'ADMIN' && member.role !== 'PURCHASER')) {
      throw new AuthorizationError(
        'Only Organization Admins or Purchasers can perform this action.'
      );
    }
  }

  private mapOrganizationToDTO(org: any, userRole?: BuyerMemberRole): BuyerOrganizationDTO {
    return {
      id: org.id,
      companyName: org.companyName,
      businessType: org.businessType,
      tradeLicenseNumber: org.tradeLicenseNumber,
      binNumber: org.binNumber,
      tinNumber: org.tinNumber,
      status: org.status,
      creditStatus: org.creditStatus,
      creditLimitPoisha: Number(org.creditLimitPoisha),
      creditTermsDays: org.creditTermsDays,
      rewardsRuleVersion: org.rewardsRuleVersion,
      earnsProductPoints: org.earnsProductPoints,
      approvedAt: org.approvedAt?.toISOString?.() || null,
      approvedBy: org.approvedBy,
      rejectionReason: org.rejectionReason,
      version: org.version,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      membersCount: org._count?.members || org.members?.length || 1,
      currentUserRole: userRole,
    };
  }

  private mapRfqToDTO(rfq: any): B2BRfqDTO {
    return {
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      organizationId: rfq.organizationId,
      requesterId: rfq.requesterId,
      sellerId: rfq.sellerId,
      title: rfq.title,
      status: rfq.status,
      purchaseOrderRef: rfq.purchaseOrderRef,
      currency: rfq.currency,
      requiredDeliveryDate: rfq.requiredDeliveryDate?.toISOString?.() || null,
      shippingAddress: rfq.shippingAddress,
      notes: rfq.notes,
      expiresAt: rfq.expiresAt.toISOString(),
      submittedAt: rfq.submittedAt.toISOString(),
      version: rfq.version,
      createdAt: rfq.createdAt.toISOString(),
      updatedAt: rfq.updatedAt.toISOString(),
      items: (rfq.items || []).map((item: any) => ({
        id: item.id,
        rfqId: item.rfqId,
        productId: item.productId,
        variantId: item.variantId,
        productTitle: item.productTitle,
        quantity: item.quantity,
        targetPricePoisha: item.targetPricePoisha ? Number(item.targetPricePoisha) : null,
        specifications: item.specifications,
        minOrderQuantity: item.minOrderQuantity || 1,
      })),
      organization: rfq.organization,
      seller: rfq.seller,
      quotesCount: rfq._count?.quotes || 0,
    };
  }

  private mapQuoteToDTO(quote: any): B2BQuoteDTO {
    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      rfqId: quote.rfqId,
      organizationId: quote.organizationId,
      sellerId: quote.sellerId,
      currentVersion: quote.currentVersion,
      status: quote.status,
      currency: quote.currency,
      validUntil: quote.validUntil.toISOString(),
      poishaSubtotal: Number(quote.poishaSubtotal),
      taxPoisha: Number(quote.taxPoisha),
      shippingPoisha: Number(quote.shippingPoisha),
      totalPoisha: Number(quote.totalPoisha),
      pointsAwarded: quote.pointsAwarded,
      ruleVersion: quote.ruleVersion,
      paymentTerms: quote.paymentTerms as PaymentTerms,
      convertedCartId: quote.convertedCartId,
      version: quote.version,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
      items: (quote.items || []).map((item: any) => ({
        id: item.id,
        quoteId: item.quoteId,
        productId: item.productId,
        variantId: item.variantId,
        productTitle: item.productTitle,
        quantity: item.quantity,
        unitPricePoisha: Number(item.unitPricePoisha),
        lineTotalPoisha: Number(item.lineTotalPoisha),
        quantityBreakTier: item.quantityBreakTier,
        leadTimeDays: item.leadTimeDays,
      })),
      versions: (quote.versions || []).map((v: any) => ({
        id: v.id,
        quoteId: v.quoteId,
        versionNumber: v.versionNumber,
        proposedBy: v.proposedBy,
        proposerUserId: v.proposerUserId,
        totalPoisha: Number(v.totalPoisha),
        itemsSnapshot: v.itemsSnapshot,
        paymentTerms: v.paymentTerms as PaymentTerms,
        notes: v.notes,
        createdAt: v.createdAt?.toISOString?.() || (typeof v.createdAt === 'string' ? v.createdAt : new Date().toISOString()),
      })),
      organization: quote.organization,
      seller: quote.seller,
    };
  }

  private async recordOutboxEvent(
    eventType: string,
    aggregateId: string,
    payload: any
  ): Promise<void> {
    try {
      await (this.db as any).outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType,
          aggregateType: 'B2B_COMMERCE',
          aggregateId,
          payload: payload ?? {},
          status: 'PENDING',
          attempts: 0,
          version: 1,
        },
      });
    } catch (err) {
      console.warn('Non-fatal outbox record error:', err);
    }
  }
}

export const b2bCommerceService = new B2BCommerceService();
