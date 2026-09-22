const CSRF_COOKIE_NAME = 'aw_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_ENDPOINT = '/api/v1/auth/csrf';

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const encoded = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.split('=').slice(1).join('=');

  return encoded ? decodeURIComponent(encoded) : null;
}

async function requestCsrfToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh) {
    const cookieToken = readCsrfCookie();
    if (cookieToken) return cookieToken;
  }

  const response = await fetch(CSRF_ENDPOINT, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (!response.ok) return null;

  const body = (await response.json().catch(() => null)) as { data?: { csrfToken?: string } } | null;
  return body?.data?.csrfToken || readCsrfCookie();
}

function isStateChanging(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase());
}

function isCsrfFailure(response: Response, body: unknown): boolean {
  if (response.status !== 403 || !body || typeof body !== 'object') return false;
  const errorCode = (body as { error?: { code?: string } }).error?.code;
  return errorCode === 'CSRF_TOKEN_MISSING' || errorCode === 'CSRF_TOKEN_INVALID';
}

/**
 * Browser fetch wrapper for cookie-authenticated state-changing requests.
 * It attaches the double-submit CSRF header and refreshes once on token drift.
 */
export async function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = init.method || 'GET';
  if (!isStateChanging(method)) {
    return fetch(input, { ...init, credentials: init.credentials || 'same-origin' });
  }

  const send = async (token: string | null): Promise<{ response: Response; body: unknown }> => {
    const headers = new Headers(init.headers);
    if (token) headers.set(CSRF_HEADER_NAME, token);

    const response = await fetch(input, {
      ...init,
      headers,
      credentials: init.credentials || 'same-origin',
    });
    const body = await response.clone().json().catch(() => null);
    return { response, body };
  };

  let token = await requestCsrfToken();
  let result = await send(token);

  if (isCsrfFailure(result.response, result.body)) {
    token = await requestCsrfToken(true);
    result = await send(token);
  }

  return result.response;
}
