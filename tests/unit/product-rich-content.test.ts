import { describe, expect, it } from 'bun:test';
import { LocalizedProductTranslationSchema, localeCandidates } from '@/features/catalog/localization';

describe('Milestone 086 localized rich product content', () => {
  it('validates localized specifications and rich content blocks', () => {
    const result = LocalizedProductTranslationSchema.safeParse({ locale: 'en-BD', title: 'Phone', description: 'A detailed product description.', specifications: { RAM: '8GB', Storage: '128GB' }, richContent: [{ type: 'heading', text: 'Highlights', level: 2 }, { type: 'bullet_list', items: ['Fast charging', 'OLED display'] }] });
    expect(result.success).toBe(true);
  });

  it('rejects unsupported rich block types and oversized content', () => {
    expect(LocalizedProductTranslationSchema.safeParse({ locale: 'en-BD', title: 'Phone', description: 'A detailed product description.', richContent: [{ type: 'script', text: '<script>' }] }).success).toBe(false);
    expect(LocalizedProductTranslationSchema.safeParse({ locale: 'en-BD', title: 'Phone', description: 'x'.repeat(10001) }).success).toBe(false);
  });

  it('keeps localized fallback language-aware', () => {
    expect(localeCandidates('en-BD')).toEqual(['en-BD', 'en']);
    expect(localeCandidates('bn-BD')).toEqual(['bn-BD', 'bn']);
  });
});
