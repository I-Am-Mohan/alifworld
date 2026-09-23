import { describe, expect, it } from 'bun:test';
import { PRODUCT_MEDIA_LIMITS, validateProductMediaFile } from '@/features/catalog/media';

describe('Milestone 085 product media policies', () => {
  it('accepts supported image and video types within limits', () => {
    expect(() => validateProductMediaFile('IMAGE', 'image/jpeg', 1024)).not.toThrow();
    expect(() => validateProductMediaFile('VIDEO', 'video/mp4', 1024)).not.toThrow();
    expect(PRODUCT_MEDIA_LIMITS.IMAGE_MAX_BYTES).toBe(10 * 1024 * 1024);
  });

  it('rejects unsupported types and oversized media', () => {
    expect(() => validateProductMediaFile('IMAGE', 'application/pdf', 1024)).toThrow();
    expect(() => validateProductMediaFile('VIDEO', 'video/mp4', PRODUCT_MEDIA_LIMITS.VIDEO_MAX_BYTES + 1)).toThrow();
  });
});
