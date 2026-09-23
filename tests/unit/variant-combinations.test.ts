import { describe, expect, it } from 'bun:test';
import { generateVariantCombinations, validateVariantCombinations } from '@/features/catalog/variant-combinations';

describe('Milestone 082 variant combination generation', () => {
  it('generates the cartesian product of governed option values', () => {
    const combinations = generateVariantCombinations([{ attributeId: 'att_color', attributeLabel: 'Color', valueIds: ['red', 'blue'], valueLabels: { red: 'Red', blue: 'Blue' } }, { attributeId: 'att_size', attributeLabel: 'Size', valueIds: ['s', 'm'] }]);
    expect(combinations).toHaveLength(4);
    expect(combinations[0].title).toContain('Color: Red');
  });

  it('rejects excessive combination counts', () => {
    expect(() => generateVariantCombinations([{ attributeId: 'att', valueIds: ['1', '2', '3'] }, { attributeId: 'att2', valueIds: ['1', '2', '3'] }], 4)).toThrow('maximum');
  });

  it('detects missing required options and duplicate signatures', () => {
    const result = validateVariantCombinations([{ options: [{ attributeId: 'color', valueId: 'red' }] }, { options: [{ attributeId: 'color', valueId: 'red' }] }], ['color', 'size']);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('missing'))).toBe(true);
    expect(result.errors.some((error) => error.includes('duplicates'))).toBe(true);
  });
});
