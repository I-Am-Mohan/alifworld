import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { SellerRepository } from '@/features/seller/repositories/seller-repository';
import { ProductApprovalRepository } from '../repositories/product-approval-repository';
import { ProductStatus } from '../types';
import { ApprovalDecisionInput, SubmitProductApprovalInput } from '../approval';

export interface ProductReadinessResult {
  ready: boolean;
  errors: string[];
  warnings: string[];
}

export class ProductApprovalService {
  constructor(
    private readonly repository: ProductApprovalRepository = new ProductApprovalRepository(),
    private readonly sellerRepository: SellerRepository = new SellerRepository(),
    private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository(),
  ) {}

  public async validateProduct(productId: string): Promise<ProductReadinessResult> {
    const product = await this.repository.findProduct(productId);
    if (!product) throw new NotFoundError(`Product '${productId}' not found.`);
    return this.readiness(product);
  }

  public async submit(actorId: string, productId: string, input: SubmitProductApprovalInput) {
    const product = await this.repository.findProduct(productId);
    if (!product) throw new NotFoundError(`Product '${productId}' not found.`);
    await this.assertSellerAccess(actorId, product.sellerId);
    if (!['DRAFT', 'REJECTED'].includes(product.status)) throw new ConflictError(`Product '${productId}' cannot be submitted from status '${product.status}'.`);
    const readiness = this.readiness(product);
    if (!readiness.ready) throw new ValidationError('Product is not ready for approval.', { errors: readiness.errors, warnings: readiness.warnings });
    if (input.idempotencyKey) {
      const existing = await this.repository.findIdempotentRequest(input.idempotencyKey);
      if (existing) return { product, request: existing, idempotent: true };
    }
    return this.repository.transition({ productId, expectedVersion: input.version, fromStatus: product.status, toStatus: ProductStatus.PENDING_APPROVAL, actorId, submittedVersion: input.version, idempotencyKey: input.idempotencyKey });
  }

  public async approve(actorId: string, productId: string, input: ApprovalDecisionInput) {
    await this.assertApprovalAccess(actorId);
    const product = await this.requireProduct(productId);
    if (product.status !== ProductStatus.PENDING_APPROVAL) throw new ConflictError('Only pending products can be approved.');
    const readiness = this.readiness(product);
    if (!readiness.ready) throw new ValidationError('Product is not ready for approval.', { errors: readiness.errors, warnings: readiness.warnings });
    return this.repository.transition({ productId, expectedVersion: input.version, fromStatus: ProductStatus.PENDING_APPROVAL, toStatus: ProductStatus.APPROVED, actorId, reason: input.reason, reviewNotes: input.reviewNotes });
  }

  public async reject(actorId: string, productId: string, input: ApprovalDecisionInput) {
    await this.assertApprovalAccess(actorId);
    const product = await this.requireProduct(productId);
    if (product.status !== ProductStatus.PENDING_APPROVAL) throw new ConflictError('Only pending products can be rejected.');
    if (!input.reason?.trim()) throw new ValidationError('A rejection reason is required.');
    return this.repository.transition({ productId, expectedVersion: input.version, fromStatus: ProductStatus.PENDING_APPROVAL, toStatus: ProductStatus.REJECTED, actorId, reason: input.reason, reviewNotes: input.reviewNotes });
  }

  public async publish(actorId: string, productId: string, input: ApprovalDecisionInput) {
    await this.assertApprovalAccess(actorId);
    const product = await this.requireProduct(productId);
    if (product.status !== ProductStatus.APPROVED) throw new ConflictError('Only approved products can be published.');
    return this.repository.transition({ productId, expectedVersion: input.version, fromStatus: ProductStatus.APPROVED, toStatus: ProductStatus.PUBLISHED, actorId, reason: input.reason, reviewNotes: input.reviewNotes });
  }

  public async archive(actorId: string, productId: string, input: ApprovalDecisionInput) {
    await this.assertApprovalAccess(actorId);
    const product = await this.requireProduct(productId);
    if (!['APPROVED', 'PUBLISHED'].includes(product.status)) throw new ConflictError('Only approved or published products can be archived.');
    return this.repository.transition({ productId, expectedVersion: input.version, fromStatus: product.status, toStatus: ProductStatus.ARCHIVED, actorId, reason: input.reason, reviewNotes: input.reviewNotes });
  }

  public async pending() { return this.repository.listPending(); }
  public async history(productId: string) { await this.requireProduct(productId); return this.repository.findHistory(productId); }

  private readiness(product: any): ProductReadinessResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!product.title?.trim()) errors.push('Product title is required.');
    if (!product.slug?.trim()) errors.push('Product slug is required for SEO redirects.');
    if (!product.description?.trim() || product.description.trim().length < 10) errors.push('Product description must contain at least 10 characters.');
    if (!product.category || !product.category.isActive || product.category.deletedAt) errors.push('Product must use an active category.');
    if (product.brandId && (!product.brand || !product.brand.isActive || product.brand.approvalStatus !== 'APPROVED' || product.brand.deletedAt)) errors.push('Selected brand must be active and approved.');
    if (!product.seller || ['SUSPENDED', 'RESTRICTED'].includes(product.seller.status)) errors.push('Seller must be verified and operational.');
    if (!product.seller || product.seller.status !== 'VERIFIED') errors.push('Seller must be verified before product approval.');
    if (product.currency !== 'BDT') errors.push('Product currency must be BDT.');
    if (!Number.isSafeInteger(Number(product.basePricePoisha)) || Number(product.basePricePoisha) <= 0) errors.push('Product price must be a positive integer number of poisha.');
    if (!Number.isInteger(product.productPoint) || product.productPoint < 0) errors.push('Product Point must be a non-negative integer.');
    if (!product.media?.some((media: any) => media.mediaType === 'IMAGE')) errors.push('At least one product image is required.');
    const requiredAttributes = product.category?.attributeAssignments?.filter((assignment: any) => assignment.isRequired) || [];
    const suppliedAttributeIds = new Set((product.attributeValues || []).map((value: any) => value.attributeId));
    for (const assignment of requiredAttributes) if (!suppliedAttributeIds.has(assignment.attributeId) && !(product.optionSets || []).some((set: any) => set.attributeId === assignment.attributeId)) errors.push(`Required category attribute '${assignment.attribute?.name || assignment.attributeId}' is missing.`);
    const variantAssignments = requiredAttributes.filter((assignment: any) => assignment.isVariantDefining).map((assignment: any) => assignment.attributeId);
    if (variantAssignments.length && !product.variants?.length) errors.push('Variant-defining category attributes require at least one variant.');
    for (const variant of product.variants || []) {
      const optionIds = new Set((variant.options || []).map((option: any) => option.attributeId));
      for (const attributeId of variantAssignments) if (!optionIds.has(attributeId)) errors.push(`Variant '${variant.sku}' is missing a required option.`);
    }
    if (product.variants?.some((variant: any) => !variant.sku)) errors.push('Every variant requires a SKU.');
    return { ready: errors.length === 0, errors, warnings };
  }

  private async requireProduct(productId: string): Promise<any> { const product = await this.repository.findProduct(productId); if (!product) throw new NotFoundError(`Product '${productId}' not found.`); return product; }
  private async assertApprovalAccess(userId: string): Promise<void> { const [superAdmin, admin] = await Promise.all([this.roles.hasRole(userId, SystemRoleCode.SUPER_ADMIN), this.roles.hasRole(userId, SystemRoleCode.ADMIN)]); if (!superAdmin && !admin) throw new AuthorizationError('Only catalog administrators can approve or publish products.'); }
  private async assertSellerAccess(userId: string, sellerId: string): Promise<void> { const seller = await this.sellerRepository.findById(sellerId); if (!seller) throw new NotFoundError(`Seller '${sellerId}' not found.`); const isOwner = seller.ownerUserId === userId; const isStaff = await this.roles.hasRole(userId, SystemRoleCode.SELLER_STAFF, sellerId); const isAdmin = await this.roles.hasRole(userId, SystemRoleCode.ADMIN) || await this.roles.hasRole(userId, SystemRoleCode.SUPER_ADMIN); if (!isOwner && !isStaff && !isAdmin) throw new AuthorizationError('You are not authorized to submit this product.'); }
}
