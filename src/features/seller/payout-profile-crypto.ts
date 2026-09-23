import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { getServerEnv } from '@/shared/config/environment';

const VERSION = 'v1';

function key(): Buffer {
  return createHash('sha256').update(getServerEnv().PAYOUT_PROFILE_ENCRYPTION_KEY).digest();
}

export function encryptPayoutSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptPayoutSecret(payload: string): string {
  const [version, ivText, tagText, ciphertextText] = payload.split('.');
  if (version !== VERSION || !ivText || !tagText || !ciphertextText) throw new Error('Invalid payout profile ciphertext.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')), decipher.final()]).toString('utf8');
}

export function payoutFingerprint(value: string): string {
  return createHash('sha256').update(value.trim().replace(/\s+/g, '')).digest('hex');
}

export function lastFour(value: string): string {
  const normalized = value.replace(/\s+/g, '');
  return normalized.slice(-4).padStart(4, '•');
}
