import { ValidationError } from '@/shared/errors/app-error';

export const MAX_KYC_FILE_SIZE = 10 * 1024 * 1024;
export const KYC_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;

function hasValidSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'application/pdf') return new TextDecoder().decode(bytes.slice(0, 4)) === '%PDF';
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (mimeType === 'image/webp') return new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  return false;
}

export function validateKycFile(file: { size: number; type: string }, bytes: Uint8Array): void {
  if (!(KYC_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new ValidationError('Unsupported document type. Use PDF, JPEG, PNG, or WebP.');
  }
  if (file.size <= 0 || file.size > MAX_KYC_FILE_SIZE) {
    throw new ValidationError('Document file must be between 1 byte and 10 MB.');
  }
  if (!hasValidSignature(bytes, file.type)) {
    throw new ValidationError('The uploaded file signature does not match its declared type.');
  }
}
