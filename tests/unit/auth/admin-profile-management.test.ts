import { describe, it, expect } from 'bun:test';
import { NextRequest } from 'next/server';
import { PATCH, GET } from '@/app/api/v1/auth/me/route';

describe('Admin Profile Management & Updates (/api/v1/auth/me)', () => {
  it('should reject profile PATCH request when unauthenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'New Admin Name',
        email: 'newadmin@alifworld.com',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject profile GET request when unauthenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/me', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });
});
