/**
 * Audit Log Sensitive Data Redaction Engine
 * 
 * Enforces append-only security by stripping credentials, tokens, secrets,
 * passwords, OTPs, PINs, card data, and authorization headers from audit payloads.
 * 
 * Invariants: NIST SP 800-63B, OWASP Logging Guidelines, Milestone 040
 */

const REDACTED_MARKER = '[REDACTED]';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passcode/i,
  /token/i,
  /secret/i,
  /salt/i,
  /hash/i,
  /credential/i,
  /otp/i,
  /pin/i,
  /authorization/i,
  /cookie/i,
  /session_?id/i,
  /refresh/i,
  /bearer/i,
  /cvv/i,
  /cvc/i,
  /pan/i,
  /card_?number/i,
  /private_?key/i,
  /api_?key/i,
  /account_?number/i,
  /routing_?number/i,
  /account_?reference/i,
  /account_?title/i,
  /ciphertext/i,
  /encrypted/i,
  /private_?object/i,
  /file_?url/i,
];

/**
 * Checks if a property key matches sensitive credential or secret patterns.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Deep-clones and recursively sanitizes a payload, replacing sensitive values with [REDACTED].
 */
export function redactSensitiveData<T = any>(data: T, seen = new WeakSet<object>()): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data !== 'object') {
    return data;
  }

  // Handle circular references
  if (seen.has(data as object)) {
    return '[CIRCULAR]' as unknown as T;
  }
  seen.add(data as object);

  // Handle Dates
  if (data instanceof Date) {
    return new Date(data.getTime()) as unknown as T;
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, seen)) as unknown as T;
  }

  // Handle Objects
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (isSensitiveKey(key)) {
      result[key] = REDACTED_MARKER;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveData(value, seen);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
