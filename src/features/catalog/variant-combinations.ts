import { ValidationError } from '@/shared/errors/app-error';

export interface VariantCombinationOption { attributeId: string; valueId: string; }
export interface GeneratedVariantCombination { key: string; options: VariantCombinationOption[]; title: string; }

export function generateVariantCombinations(optionSets: Array<{ attributeId: string; attributeLabel?: string; valueIds: string[]; valueLabels?: Record<string, string> }>, maxCombinations = 1000): GeneratedVariantCombination[] {
  if (!optionSets.length) return [];
  if (optionSets.some((set) => !set.attributeId || !set.valueIds.length)) throw new ValidationError('Every variant-defining attribute must contain at least one value.');
  const combinations: GeneratedVariantCombination[] = [{ key: '', options: [], title: '' }];
  for (const set of optionSets) {
    const next: GeneratedVariantCombination[] = [];
    for (const current of combinations) for (const valueId of [...new Set(set.valueIds)]) {
      const label = set.valueLabels?.[valueId] || valueId;
      const options = [...current.options, { attributeId: set.attributeId, valueId }];
      next.push({ key: options.map((option) => `${option.attributeId}:${option.valueId}`).join('|'), options, title: [...(current.title ? [current.title] : []), `${set.attributeLabel || set.attributeId}: ${label}`].join(' / ') });
      if (next.length > maxCombinations) throw new ValidationError(`Variant combination count exceeds the maximum of ${maxCombinations}.`);
    }
    combinations.splice(0, combinations.length, ...next);
  }
  return combinations;
}

export function validateVariantCombinations(variants: Array<{ options?: Array<{ attributeId: string; valueId?: string | null; textValue?: string | null }> }>, requiredAttributeIds: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []; const signatures = new Set<string>();
  for (const [index, variant] of variants.entries()) {
    const options = variant.options || []; const attributes = options.map((option) => option.attributeId);
    if (new Set(attributes).size !== attributes.length) errors.push(`Variant ${index + 1} contains duplicate attributes.`);
    for (const attributeId of requiredAttributeIds) if (!options.some((option) => option.attributeId === attributeId && (option.valueId || option.textValue))) errors.push(`Variant ${index + 1} is missing required attribute '${attributeId}'.`);
    const signature = options.map((option) => `${option.attributeId}:${option.valueId || option.textValue || ''}`).sort().join('|');
    if (signatures.has(signature)) errors.push(`Variant ${index + 1} duplicates an existing option combination.`);
    signatures.add(signature);
  }
  return { valid: errors.length === 0, errors };
}
