import { z } from 'zod';

export const SKU_SCHEMA = z.string().trim().toUpperCase().min(3).max(50).regex(/^[A-Z0-9_-]+$/, 'SKU must contain only uppercase letters, numbers, dashes, or underscores.');
export const BARCODE_SCHEMA = z.string().trim().regex(/^[0-9]{8,14}$/, 'Barcode must contain 8 to 14 digits.');

export function normalizeSku(value: string): string { return value.trim().toUpperCase(); }
export function normalizeBarcode(value: string): string { return value.replace(/\s+/g, ''); }
export function isValidEan13(value: string): boolean { if (!/^\d{13}$/.test(value)) return false; const digits = value.split('').map(Number); const checksum = digits.slice(0, 12).reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 1 : 3), 0); return (10 - (checksum % 10)) % 10 === digits[12]; }

export const IdentifierCheckSchema = z.object({ sku: SKU_SCHEMA.optional(), barcode: BARCODE_SCHEMA.optional() }).refine((input) => input.sku || input.barcode, 'SKU or barcode is required.');
