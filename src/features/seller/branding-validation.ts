import { ValidationError } from '@/shared/errors/app-error';

export const BRANDING_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function validateBrandingFile(file: { size: number; type: string }, bytes: Uint8Array, assetType: 'LOGO' | 'BANNER'): void {
  const maxSize = assetType === 'LOGO' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
  if (!(BRANDING_MIME_TYPES as readonly string[]).includes(file.type)) throw new ValidationError('Branding assets must be JPEG, PNG, or WebP images.');
  if (file.size <= 0 || file.size > maxSize) throw new ValidationError(`The ${assetType.toLowerCase()} must not exceed ${assetType === 'LOGO' ? '2' : '5'} MB.`);
  const matches = file.type === 'image/jpeg'
    ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : file.type === 'image/png'
      ? bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])
      : new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  if (!matches) throw new ValidationError('The branding file signature does not match its declared image type.');
}
