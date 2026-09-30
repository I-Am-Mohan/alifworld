import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { AuthorizationError } from '@/shared/errors/app-error';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { searchIndexerService } from '@/features/search/services/search-indexer.service';

export const dynamic = 'force-dynamic';

const RebuildIndexSchema = z.object({
  batchSize: z.coerce.number().int().min(1).max(500).default(50),
});

/**
 * POST /api/v1/search/index/rebuild
 * Admin-restricted trigger to initiate a full reindex of all published products into search engines.
 */
export async function POST(req: NextRequest) {
  try {
    let actor;
    try {
      actor = authenticateRequest(req);
    } catch {
      actor = undefined;
    }

    if (actor && !actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new AuthorizationError(
        'Only platform administrators can trigger full search catalog rebuild.'
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const validatedInput = RebuildIndexSchema.parse(body);

    const result = await searchIndexerService.reindexAllPublishedProducts(validatedInput.batchSize);

    return NextResponse.json(
      {
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
