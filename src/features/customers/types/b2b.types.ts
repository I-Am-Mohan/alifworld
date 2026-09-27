/**
 * B2B Buyer Organizations, RFQs & Negotiated Commerce Types
 *
 * Domain types for business buyer organizations, member authorization,
 * Requests for Quote (RFQs), quotes, negotiation versions, and conversions.
 *
 * Invariant: Credit terms remain disabled until explicitly approved by Admin.
 * Invariant: B2B reward/point eligibility is governed by versioned configuration.
 */

export type BusinessOrganizationStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type B2BCreditStatus = 'DISABLED' | 'PENDING_APPROVAL' | 'APPROVED' | 'SUSPENDED';

export type BuyerMemberRole = 'ADMIN' | 'PURCHASER' | 'APPROVER' | 'VIEWER';

export type B2BRfqStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type B2BQuoteStatus =
  | 'PENDING_BUYER_REVIEW'
  | 'PENDING_INTERNAL_APPROVAL'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED';

export type PaymentTerms = 'IMMEDIATE' | 'NET_15' | 'NET_30' | 'NET_60';

export interface BuyerOrganizationDTO {
  id: string;
  companyName: string;
  businessType: string;
  tradeLicenseNumber: string | null;
  binNumber: string | null;
  tinNumber: string | null;
  status: BusinessOrganizationStatus;
  creditStatus: B2BCreditStatus;
  creditLimitPoisha: number;
  creditTermsDays: number;
  rewardsRuleVersion: string;
  earnsProductPoints: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  membersCount?: number;
  currentUserRole?: BuyerMemberRole;
}

export interface BuyerOrganizationMemberDTO {
  id: string;
  organizationId: string;
  userId: string;
  role: BuyerMemberRole;
  spendingLimitPoisha: number;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  version: number;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export interface B2BRfqItemDTO {
  id: string;
  rfqId: string;
  productId: string;
  variantId: string | null;
  productTitle: string;
  quantity: number;
  targetPricePoisha: number | null;
  specifications: string | null;
  minOrderQuantity: number;
}

export interface B2BRfqDTO {
  id: string;
  rfqNumber: string;
  organizationId: string;
  requesterId: string;
  sellerId: string | null;
  title: string;
  status: B2BRfqStatus;
  purchaseOrderRef: string | null;
  currency: string;
  requiredDeliveryDate: string | null;
  shippingAddress: string | null;
  notes: string | null;
  expiresAt: string;
  submittedAt: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  items: B2BRfqItemDTO[];
  organization?: {
    id: string;
    companyName: string;
  };
  seller?: {
    id: string;
    businessName: string;
  } | null;
  quotesCount?: number;
}

export interface B2BQuoteItemDTO {
  id: string;
  quoteId: string;
  productId: string;
  variantId: string | null;
  productTitle: string;
  quantity: number;
  unitPricePoisha: number;
  lineTotalPoisha: number;
  quantityBreakTier: string | null;
  leadTimeDays: number | null;
}

export interface B2BQuoteVersionDTO {
  id: string;
  quoteId: string;
  versionNumber: number;
  proposedBy: 'SELLER' | 'BUYER';
  proposerUserId: string;
  totalPoisha: number;
  itemsSnapshot: Array<{
    productId: string;
    variantId: string | null;
    productTitle: string;
    quantity: number;
    unitPricePoisha: number;
    lineTotalPoisha: number;
    quantityBreakTier?: string | null;
  }>;
  paymentTerms: PaymentTerms;
  notes: string | null;
  createdAt: string;
}

export interface B2BQuoteDTO {
  id: string;
  quoteNumber: string;
  rfqId: string;
  organizationId: string;
  sellerId: string;
  currentVersion: number;
  status: B2BQuoteStatus;
  currency: string;
  validUntil: string;
  poishaSubtotal: number;
  taxPoisha: number;
  shippingPoisha: number;
  totalPoisha: number;
  pointsAwarded: number;
  ruleVersion: string;
  paymentTerms: PaymentTerms;
  convertedCartId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  items: B2BQuoteItemDTO[];
  versions: B2BQuoteVersionDTO[];
  organization?: {
    id: string;
    companyName: string;
  };
  seller?: {
    id: string;
    businessName: string;
  };
}

export interface B2BConfigRule {
  version: string;
  earnsProductPoints: boolean;
  defaultQuoteExpiryDays: number;
  maxCreditDaysAllowed: number;
  requireInternalApprovalAboveSpendingLimit: boolean;
}
