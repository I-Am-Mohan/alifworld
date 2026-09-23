import { prisma } from '@/shared/database/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { CatalogAttributeModel, CatalogAttributeValueModel, CategoryAttributeModel, ProductOptionSetModel, ProductVariantOptionModel } from '../types';
import { CreateCatalogAttributeInput, CreateCatalogAttributeValueInput, UpdateCatalogAttributeInput, UpdateCatalogAttributeValueInput } from '../validators';

export class AttributeRepository {
  public async findById(id: string): Promise<CatalogAttributeModel | null> {
    const record = await (prisma as any).catalogAttribute.findFirst({ where: { id, deletedAt: null } });
    return record ? this.mapAttribute(record) : null;
  }

  public async findAll(activeOnly = true): Promise<CatalogAttributeModel[]> {
    const records = await (prisma as any).catalogAttribute.findMany({ where: { deletedAt: null, ...(activeOnly ? { isActive: true } : {}) }, orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] });
    return records.map((record: any) => this.mapAttribute(record));
  }

  public async create(input: CreateCatalogAttributeInput): Promise<CatalogAttributeModel> {
    const record = await (prisma as any).catalogAttribute.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.ATTRIBUTE), ...input, version: 1 } });
    return this.mapAttribute(record);
  }

  public async update(id: string, expectedVersion: number, input: UpdateCatalogAttributeInput): Promise<CatalogAttributeModel> {
    const existing = await (prisma as any).catalogAttribute.findFirst({ where: { id, deletedAt: null } });
    this.assertVersion(existing, id, expectedVersion, 'Catalog attribute');
    const { version: _version, ...data } = input;
    const record = await (prisma as any).catalogAttribute.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
    return this.mapAttribute(record);
  }

  public async findValueById(id: string): Promise<CatalogAttributeValueModel | null> {
    const record = await (prisma as any).catalogAttributeValue.findFirst({ where: { id, deletedAt: null } });
    return record ? this.mapValue(record) : null;
  }

  public async findValues(attributeId: string, activeOnly = true): Promise<CatalogAttributeValueModel[]> {
    const records = await (prisma as any).catalogAttributeValue.findMany({ where: { attributeId, deletedAt: null, ...(activeOnly ? { isActive: true } : {}) }, orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }] });
    return records.map((record: any) => this.mapValue(record));
  }

  public async createValue(attributeId: string, input: CreateCatalogAttributeValueInput): Promise<CatalogAttributeValueModel> {
    const attribute = await this.findById(attributeId);
    if (!attribute) throw new NotFoundError(`Catalog attribute '${attributeId}' not found.`);
    const record = await (prisma as any).catalogAttributeValue.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.ATTRIBUTE_VALUE), attributeId, ...input, version: 1 } });
    return this.mapValue(record);
  }

  public async updateValue(id: string, expectedVersion: number, input: UpdateCatalogAttributeValueInput): Promise<CatalogAttributeValueModel> {
    const existing = await (prisma as any).catalogAttributeValue.findFirst({ where: { id, deletedAt: null } });
    this.assertVersion(existing, id, expectedVersion, 'Catalog attribute value');
    const { version: _version, ...data } = input;
    const record = await (prisma as any).catalogAttributeValue.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
    return this.mapValue(record);
  }

  private assertVersion(existing: any, id: string, expectedVersion: number, label: string): void {
    if (!existing) throw new NotFoundError(`${label} '${id}' not found.`);
    if (existing.version !== expectedVersion) throw new ConflictError(`Optimistic concurrency conflict on ${label} '${id}'.`);
  }

  private mapAttribute(record: any): CatalogAttributeModel { return { id: record.id, code: record.code, name: record.name, nameBn: record.nameBn, inputType: record.inputType, isFilterable: record.isFilterable, isComparable: record.isComparable, isVariantAllowed: record.isVariantAllowed, displayOrder: record.displayOrder, isActive: record.isActive, version: record.version, deletedAt: record.deletedAt, createdAt: record.createdAt, updatedAt: record.updatedAt }; }
  private mapValue(record: any): CatalogAttributeValueModel { return { id: record.id, attributeId: record.attributeId, code: record.code, label: record.label, labelBn: record.labelBn, swatch: record.swatch, displayOrder: record.displayOrder, isActive: record.isActive, version: record.version, deletedAt: record.deletedAt, createdAt: record.createdAt, updatedAt: record.updatedAt }; }
}

export class CategoryAttributeRepository {
  public async findByCategory(categoryId: string): Promise<CategoryAttributeModel[]> {
    const records = await (prisma as any).categoryAttribute.findMany({ where: { categoryId, attribute: { deletedAt: null, isActive: true } }, include: { attribute: true }, orderBy: { displayOrder: 'asc' } });
    return records.map((record: any) => ({ id: record.id, categoryId: record.categoryId, attributeId: record.attributeId, isRequired: record.isRequired, isVariantDefining: record.isVariantDefining, filterableOverride: record.filterableOverride, displayOrder: record.displayOrder, version: record.version, attribute: { id: record.attribute.id, code: record.attribute.code, name: record.attribute.name, nameBn: record.attribute.nameBn, inputType: record.attribute.inputType, isFilterable: record.attribute.isFilterable, isComparable: record.attribute.isComparable, isVariantAllowed: record.attribute.isVariantAllowed, displayOrder: record.attribute.displayOrder, isActive: record.attribute.isActive, version: record.attribute.version, createdAt: record.attribute.createdAt, updatedAt: record.attribute.updatedAt } }));
  }

  public async replace(categoryId: string, assignments: Array<{ attributeId: string; isRequired: boolean; isVariantDefining: boolean; filterableOverride?: boolean | null; displayOrder: number }>): Promise<CategoryAttributeModel[]> {
    const attributeIds = assignments.map((assignment) => assignment.attributeId);
    if (new Set(attributeIds).size !== attributeIds.length) throw new ValidationError('Category attributes must be unique.');
    const attributes = await (prisma as any).catalogAttribute.findMany({ where: { id: { in: attributeIds }, deletedAt: null, isActive: true }, select: { id: true, isVariantAllowed: true } });
    if (attributes.length !== attributeIds.length) throw new ValidationError('Every assigned attribute must be active and governed.');
    const byId = new Map<string, { id: string; isVariantAllowed: boolean }>(attributes.map((attribute: any) => [attribute.id, attribute] as [string, { id: string; isVariantAllowed: boolean }]));
    for (const assignment of assignments) if (assignment.isVariantDefining && !byId.get(assignment.attributeId)?.isVariantAllowed) throw new ValidationError(`Attribute '${assignment.attributeId}' cannot define variants.`);
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.categoryAttribute.deleteMany({ where: { categoryId } });
      if (assignments.length) await tx.categoryAttribute.createMany({ data: assignments.map((assignment) => ({ id: generatePrefixedId(ENTITY_PREFIXES.CATEGORY_ATTRIBUTE), categoryId, ...assignment, version: 1 })) });
    });
    return this.findByCategory(categoryId);
  }
}

export class ProductOptionSetRepository {
  public async findByProduct(productId: string): Promise<ProductOptionSetModel[]> {
    const records = await (prisma as any).productOptionSet.findMany({ where: { productId }, include: { values: { orderBy: { displayOrder: 'asc' } } }, orderBy: { displayOrder: 'asc' } });
    return records.map((record: any) => ({ id: record.id, productId: record.productId, attributeId: record.attributeId, isRequired: record.isRequired, isVariantDefining: record.isVariantDefining, displayOrder: record.displayOrder, version: record.version, valueIds: record.values.map((value: any) => value.valueId) }));
  }

  public async replace(productId: string, expectedVersion: number, optionSets: Array<{ attributeId: string; valueIds: string[]; isRequired: boolean; isVariantDefining: boolean; displayOrder: number }>): Promise<ProductOptionSetModel[]> {
    const product = await (prisma as any).product.findFirst({ where: { id: productId, deletedAt: null }, select: { version: true } });
    if (!product) throw new NotFoundError(`Product '${productId}' not found.`);
    if (product.version !== expectedVersion) throw new ConflictError(`Optimistic concurrency conflict on Product '${productId}'.`);
    const attributeIds = optionSets.map((set) => set.attributeId);
    if (new Set(attributeIds).size !== attributeIds.length) throw new ValidationError('Product option-set attributes must be unique.');
    const values = optionSets.flatMap((set) => set.valueIds);
    const valueRecords = await (prisma as any).catalogAttributeValue.findMany({ where: { id: { in: values }, isActive: true, deletedAt: null }, select: { id: true, attributeId: true } });
    if (valueRecords.length !== new Set(values).size) throw new ValidationError('Option sets may only use active governed values.');
    const valueById = new Map<string, { id: string; attributeId: string }>(valueRecords.map((value: any) => [value.id, value] as [string, { id: string; attributeId: string }]));
    for (const set of optionSets) for (const valueId of set.valueIds) if (valueById.get(valueId)?.attributeId !== set.attributeId) throw new ValidationError('Option value does not belong to its attribute.');
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.productOptionSet.deleteMany({ where: { productId } });
      for (const set of optionSets) {
        const optionSetId = generatePrefixedId(ENTITY_PREFIXES.OPTION_SET);
        await tx.productOptionSet.create({ data: { id: optionSetId, productId, attributeId: set.attributeId, isRequired: set.isRequired, isVariantDefining: set.isVariantDefining, displayOrder: set.displayOrder, values: { create: set.valueIds.map((valueId, index) => ({ id: generatePrefixedId(ENTITY_PREFIXES.OPTION_SET), valueId, displayOrder: index })) } } });
      }
      await tx.product.update({ where: { id: productId }, data: { version: { increment: 1 } } });
    });
    return this.findByProduct(productId);
  }
}

export class VariantOptionRepository {
  public async findByVariant(variantId: string): Promise<ProductVariantOptionModel[]> {
    const records = await (prisma as any).productVariantOption.findMany({ where: { variantId }, orderBy: { displayOrder: 'asc' } });
    return records.map((record: any) => ({ id: record.id, variantId: record.variantId, attributeId: record.attributeId, valueId: record.valueId, textValue: record.textValue, displayOrder: record.displayOrder }));
  }

  public async replace(variantId: string, expectedVersion: number, options: Array<{ attributeId: string; valueId?: string; textValue?: string; displayOrder: number }>): Promise<ProductVariantOptionModel[]> {
    const variant = await (prisma as any).productVariant.findFirst({ where: { id: variantId, deletedAt: null }, select: { version: true } });
    if (!variant) throw new NotFoundError(`Variant '${variantId}' not found.`);
    if (variant.version !== expectedVersion) throw new ConflictError(`Optimistic concurrency conflict on Variant '${variantId}'.`);
    if (new Set(options.map((option) => option.attributeId)).size !== options.length) throw new ValidationError('A variant cannot contain duplicate attributes.');
    const valueIds = options.flatMap((option) => option.valueId ? [option.valueId] : []);
    const values = await (prisma as any).catalogAttributeValue.findMany({ where: { id: { in: valueIds }, isActive: true, deletedAt: null }, select: { id: true, attributeId: true } });
    const valueById = new Map<string, { id: string; attributeId: string }>(values.map((value: any) => [value.id, value] as [string, { id: string; attributeId: string }]));
    if (values.length !== new Set(valueIds).size) throw new ValidationError('Variant options may only use active governed values.');
    for (const option of options) if (option.valueId && valueById.get(option.valueId)?.attributeId !== option.attributeId) throw new ValidationError('Variant option value does not belong to its attribute.');
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.productVariantOption.deleteMany({ where: { variantId } });
      if (options.length) await tx.productVariantOption.createMany({ data: options.map((option) => ({ id: generatePrefixedId(ENTITY_PREFIXES.VARIANT_OPTION), variantId, attributeId: option.attributeId, valueId: option.valueId ?? null, textValue: option.textValue ?? null, displayOrder: option.displayOrder })) });
      await tx.productVariant.update({ where: { id: variantId }, data: { version: { increment: 1 } } });
    });
    return this.findByVariant(variantId);
  }
}
