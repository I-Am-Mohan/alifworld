/**
 * AlifWorld Standardized Identifier Generation & Validation Utility
 * 
 * Provides type-safe, human-readable, collision-resistant, and k-sortable IDs
 * prefixed by domain entity abbreviations.
 * 
 * Format: {prefix}_{timestampBase36}{entropyHex}
 * Example: usr_1j7x4b9e8m02k3f8d7c6b5a4
 * 
 * Reference: docs/architecture/identifiers-lifecycle-and-deletion-policy.md
 * Invariant: ADR-0022
 */

import { randomBytes } from 'crypto';

/**
 * Standardized domain prefix registry for all AlifWorld entities.
 */
export const ID_PREFIXES = {
  USER: 'usr',
  SELLER: 'sel',
  CATEGORY: 'cat',
  PRODUCT: 'prd',
  VARIANT: 'var',
  CART: 'crt',
  CART_ITEM: 'cit',
  ORDER: 'ord',
  ORDER_ITEM: 'itm',
  FULFILLMENT_GROUP: 'sfg',
  ORDER_STATUS_HISTORY: 'osh',
  PAYMENT: 'pay',
  REFUND: 'ref',
  REFUND_ITEM: 'rfi',
  COMMISSION: 'com',
  SETTLEMENT: 'stl',
  PAYOUT: 'pot',
  WEBHOOK_LOG: 'pwl',
  WALLET: 'wal',
  LEDGER: 'led',
  TRANSACTION: 'tx',
  OUTBOX: 'evt',
  AUDIT: 'aud',
  PROBE: 'prb',
  CONFIG: 'cfg',
  ROLE: 'rol',
  PERMISSION: 'prm',
  ROLE_PERMISSION: 'rpm',
  ROLE_ASSIGNMENT: 'ura',
  STAFF: 'stf',
  KYC_DOCUMENT: 'kyc',
  STORE_SETTINGS: 'set',
  BRAND: 'brd',
  MEDIA: 'med',
  SHIPMENT: 'shp',
  SHIPMENT_EVENT: 'she',
  INVENTORY: 'inv',
  WAREHOUSE: 'whs',
  STOCK_BALANCE: 'stb',
  STOCK_RESERVATION: 'res',
  STOCK_MOVEMENT: 'mov',
  LEDGER_ACCOUNT: 'lac',
  LEDGER_JOURNAL: 'jrn',
  LEDGER_POSTING: 'pos',
  POINT_ACCOUNT: 'pac',
  POINT_EVENT: 'pev',
  REWARD_RULE: 'rwr',
  REWARD_ALLOCATION: 'rwa',
  RANK_DEFINITION: 'rnk',
  USER_RANK: 'urk',
  LEADERBOARD_SNAPSHOT: 'lbs',
  SESSION: 'ses',
  FAMILY: 'fam',
  OTP: 'otp',
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

export const ENTITY_PREFIXES = ID_PREFIXES;

const ALL_PREFIXES = new Set<string>(Object.values(ID_PREFIXES));
const ID_REGEX = /^[a-z]{3}_[0-9a-z]{16,40}$/;

/**
 * Generates a standardized, collision-resistant, k-sortable entity ID.
 * Combines domain prefix, millisecond timestamp in base36, and 16 hex characters of entropy.
 */
export function generateId(prefix: IdPrefix): string {
  const timestamp = Date.now().toString(36).padStart(8, '0');
  const entropy = randomBytes(8).toString('hex');
  return `${prefix}_${timestamp}${entropy}`;
}

export const generatePrefixedId = generateId;

/**
 * Validates that an identifier matches the standardized AlifWorld format
 * and optionally verifies it has the expected domain prefix.
 */
export function isValidId(id: unknown, expectedPrefix?: IdPrefix): boolean {
  if (typeof id !== 'string' || !ID_REGEX.test(id)) {
    return false;
  }

  const prefix = id.slice(0, 3);
  if (!ALL_PREFIXES.has(prefix)) {
    return false;
  }

  if (expectedPrefix && prefix !== expectedPrefix) {
    return false;
  }

  return true;
}

/**
 * Extracts the 3-letter domain prefix from a standardized entity identifier.
 */
export function extractPrefix(id: string): IdPrefix | null {
  if (typeof id !== 'string' || id.length < 4 || id.charAt(3) !== '_') {
    return null;
  }

  const prefix = id.slice(0, 3);
  return ALL_PREFIXES.has(prefix) ? (prefix as IdPrefix) : null;
}

/**
 * Deconstructs a standardized ID into its constituent components.
 */
export function parseId(id: string): {
  prefix: IdPrefix | null;
  rawPayload: string;
  isValid: boolean;
} {
  const isValid = isValidId(id);
  const prefix = extractPrefix(id);
  const rawPayload = prefix && id.length > 4 ? id.slice(4) : '';

  return {
    prefix,
    rawPayload,
    isValid,
  };
}
