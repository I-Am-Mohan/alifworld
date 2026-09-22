import { NextResponse } from 'next/server';
import { openApiSpec } from '../../../../../scripts/generate-openapi';

export const dynamic = 'force-dynamic';

/**
 * Route handler serving the OpenAPI 3.1 schema document
 */
export async function GET() {
  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
