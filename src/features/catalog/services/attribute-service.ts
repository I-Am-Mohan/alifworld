import { AttributeRepository, CategoryAttributeRepository, ProductOptionSetRepository, VariantOptionRepository } from '../repositories/attribute-repository';
import { CatalogAttributeModel, CatalogAttributeValueModel, CategoryAttributeModel, ProductOptionSetModel, ProductVariantOptionModel } from '../types';
import { CreateCatalogAttributeInput, CreateCatalogAttributeValueInput, UpdateCatalogAttributeInput, UpdateCatalogAttributeValueInput, CategoryAttributeAssignmentInput, ProductOptionSetsInput, VariantOptionsInput } from '../validators';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError, ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';

export class AttributeService {
  constructor(
    private readonly repository: AttributeRepository = new AttributeRepository(),
    private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository(),
  ) {}

  public async listAttributes(includeInactive = false): Promise<CatalogAttributeModel[]> { return this.repository.findAll(!includeInactive); }
  public async createAttribute(adminUserId: string, input: CreateCatalogAttributeInput): Promise<CatalogAttributeModel> {
    await this.assertAdmin(adminUserId);
    const existing = await (prisma as any).catalogAttribute.findFirst({ where: { code: input.code, deletedAt: null } });
    if (existing) throw new ConflictError(`Attribute code '${input.code}' is already registered.`);
    const attribute = await this.repository.create(input);
    await this.audit(adminUserId, 'CATALOG_ATTRIBUTE_CREATE', attribute.id, { code: attribute.code });
    return attribute;
  }
  public async updateAttribute(adminUserId: string, id: string, input: UpdateCatalogAttributeInput): Promise<CatalogAttributeModel> {
    await this.assertAdmin(adminUserId);
    const attribute = await this.repository.update(id, input.version, input);
    await this.audit(adminUserId, 'CATALOG_ATTRIBUTE_UPDATE', id, { version: attribute.version });
    return attribute;
  }
  public async listValues(attributeId: string, includeInactive = false): Promise<CatalogAttributeValueModel[]> { return this.repository.findValues(attributeId, !includeInactive); }
  public async createValue(adminUserId: string, attributeId: string, input: CreateCatalogAttributeValueInput): Promise<CatalogAttributeValueModel> {
    await this.assertAdmin(adminUserId);
    const duplicate = await (prisma as any).catalogAttributeValue.findFirst({ where: { attributeId, code: input.code, deletedAt: null } });
    if (duplicate) throw new ConflictError(`Attribute value code '${input.code}' is already registered.`);
    const value = await this.repository.createValue(attributeId, input);
    await this.audit(adminUserId, 'CATALOG_ATTRIBUTE_VALUE_CREATE', value.id, { attributeId });
    return value;
  }
  public async updateValue(adminUserId: string, id: string, input: UpdateCatalogAttributeValueInput): Promise<CatalogAttributeValueModel> {
    await this.assertAdmin(adminUserId);
    const value = await this.repository.updateValue(id, input.version, input);
    await this.audit(adminUserId, 'CATALOG_ATTRIBUTE_VALUE_UPDATE', id, { version: value.version });
    return value;
  }
  private async assertAdmin(userId: string): Promise<void> {
    const [superAdmin, admin] = await Promise.all([this.roles.hasRole(userId, SystemRoleCode.SUPER_ADMIN), this.roles.hasRole(userId, SystemRoleCode.ADMIN)]);
    if (!superAdmin && !admin) throw new AuthorizationError('Only system administrators can manage catalog attributes.');
  }
  private async audit(actorId: string, action: string, resourceId: string, metadata: Record<string, unknown>): Promise<void> { await (prisma as any).auditLog.create({ data: { actorId, action, resource: 'CatalogAttribute', resourceId, metadata } }); }
}

export class CategoryAttributeService {
  constructor(private readonly repository: CategoryAttributeRepository = new CategoryAttributeRepository(), private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()) {}
  public async list(categoryId: string): Promise<CategoryAttributeModel[]> { return this.repository.findByCategory(categoryId); }
  public async replace(adminUserId: string, categoryId: string, assignments: CategoryAttributeAssignmentInput[]): Promise<CategoryAttributeModel[]> {
    await this.assertAdmin(adminUserId);
    const result = await this.repository.replace(categoryId, assignments);
    await (prisma as any).auditLog.create({ data: { actorId: adminUserId, action: 'CATEGORY_ATTRIBUTES_REPLACE', resource: 'Category', resourceId: categoryId, metadata: { count: result.length } } });
    return result;
  }
  private async assertAdmin(userId: string): Promise<void> { const [superAdmin, admin] = await Promise.all([this.roles.hasRole(userId, SystemRoleCode.SUPER_ADMIN), this.roles.hasRole(userId, SystemRoleCode.ADMIN)]); if (!superAdmin && !admin) throw new AuthorizationError('Only system administrators can assign catalog attributes.'); }
}

export class ProductOptionSetService {
  constructor(private readonly repository: ProductOptionSetRepository = new ProductOptionSetRepository(), private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()) {}
  public async list(productId: string): Promise<ProductOptionSetModel[]> { return this.repository.findByProduct(productId); }
  public async replace(actorUserId: string, productId: string, input: ProductOptionSetsInput): Promise<ProductOptionSetModel[]> { await this.assertProductAccess(actorUserId, productId); return this.repository.replace(productId, input.version, input.optionSets); }
  private async assertProductAccess(userId: string, productId: string): Promise<void> {
    const product = await (prisma as any).product.findFirst({ where: { id: productId, deletedAt: null }, select: { sellerId: true } });
    if (!product) throw new NotFoundError(`Product '${productId}' not found.`);
    const isAdmin = await this.roles.hasRole(userId, SystemRoleCode.ADMIN) || await this.roles.hasRole(userId, SystemRoleCode.SUPER_ADMIN);
    const seller = await (prisma as any).seller.findFirst({ where: { id: product.sellerId, deletedAt: null }, select: { ownerUserId: true } });
    const isStaff = await this.roles.hasRole(userId, SystemRoleCode.SELLER_STAFF, product.sellerId);
    if (!isAdmin && seller?.ownerUserId !== userId && !isStaff) throw new AuthorizationError('You are not authorized to manage this product option set.');
  }
}

export class VariantOptionService {
  constructor(private readonly repository: VariantOptionRepository = new VariantOptionRepository(), private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()) {}
  public async list(variantId: string): Promise<ProductVariantOptionModel[]> { return this.repository.findByVariant(variantId); }
  public async replace(actorUserId: string, variantId: string, input: VariantOptionsInput): Promise<ProductVariantOptionModel[]> {
    const variant = await (prisma as any).productVariant.findFirst({ where: { id: variantId, deletedAt: null }, select: { product: { select: { sellerId: true } } } });
    if (!variant) throw new NotFoundError(`Variant '${variantId}' not found.`);
    const productSellerId = variant.product.sellerId;
    const isAdmin = await this.roles.hasRole(actorUserId, SystemRoleCode.ADMIN) || await this.roles.hasRole(actorUserId, SystemRoleCode.SUPER_ADMIN);
    const seller = await (prisma as any).seller.findFirst({ where: { id: productSellerId, deletedAt: null }, select: { ownerUserId: true } });
    const isStaff = await this.roles.hasRole(actorUserId, SystemRoleCode.SELLER_STAFF, productSellerId);
    if (!isAdmin && seller?.ownerUserId !== actorUserId && !isStaff) throw new AuthorizationError('You are not authorized to manage this variant.');
    return this.repository.replace(variantId, input.version, input.options);
  }
}
