/**
 * Shared Testing Helpers and Fixture Utilities
 * Reference: Milestone 018
 */

export interface MockUserSession {
  userId: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN';
  sellerId?: string;
  email: string;
}

/**
 * Creates a mock authenticated session fixture for testing authorization guards.
 */
export function createMockSession(overrides: Partial<MockUserSession> = {}): MockUserSession {
  return {
    userId: overrides.userId ?? 'usr_test_01j7x4b9e8m02k3',
    role: overrides.role ?? 'CUSTOMER',
    sellerId: overrides.sellerId,
    email: overrides.email ?? 'tester@mail.com',
  };
}

/**
 * Creates a mock Next.js Request object with standard headers.
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): Request {
  const headers = new Headers(options.headers ?? {});
  if (!headers.has('content-type') && options.body) {
    headers.set('content-type', 'application/json');
  }

  return new Request(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}
