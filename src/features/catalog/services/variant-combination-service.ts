import { prisma } from '@/shared/database/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { ProductOptionSetRepository, VariantOptionRepository } from '../repositories/attribute-repository';
import { ProductVariantRepository } from '../repositories/product-variant-repository';
import { generateVariantCombinations, validateVariantCombinations } from '../variant-combinations';

export class VariantCombinationService {
  constructor(private readonly optionSets: ProductOptionSetRepository = new ProductOptionSetRepository(), private readonly variantOptions: VariantOptionRepository = new VariantOptionRepository(), private readonly variants: ProductVariantRepository = new ProductVariantRepository()) {}

  public async generate(productId: string, maxCombinations = 1000) {
    const product = await (prisma as any).product.findFirst({ where: { id: productId, deletedAt: null }, include: { optionSets: { include: { attribute: true, values: { include: { value: true } } } } } });
    if (!product) throw new NotFoundError(`Product '${productId}' not found.`);
    const optionSets = product.optionSets.filter((set: any) => set.isVariantDefining).map((set: any) => ({ attributeId: set.attributeId, attributeLabel: set.attribute.name, valueIds: set.values.map((value: any) => value.valueId), valueLabels: Object.fromEntries(set.values.map((value: any) => [value.valueId, value.value.label])) }));
    return generateVariantCombinations(optionSets, maxCombinations);
  }

  public async validate(productId: string) {
    const product = await (prisma as any).product.findFirst({ where: { id: productId, deletedAt: null }, include: { category: { include: { attributeAssignments: true } }, variants: { where: { deletedAt: null }, include: { options: true } } } });
    if (!product) throw new NotFoundError(`Product '${productId}' not found.`);
    const required = product.category.attributeAssignments.filter((assignment: any) => assignment.isVariantDefining).map((assignment: any) => assignment.attributeId);
    return validateVariantCombinations(product.variants, required);
  }

  public async replaceVariantOptions(variantId: string, expectedVersion: number, options: Array<{ attributeId: string; valueId?: string; textValue?: string; displayOrder: number }>) {
    const variant = await (prisma as any).productVariant.findFirst({ where: { id: variantId, deletedAt: null }, select: { productId: true } });
    if (!variant) throw new NotFoundError(`Variant '${variantId}' not found.`);
    const validation = await this.validate(variant.productId);
    if (!validation.valid && options.length === 0) throw new ValidationError('Variant options are required.', validation);
    return this.variantOptions.replace(variantId, expectedVersion, options);
  }
}
