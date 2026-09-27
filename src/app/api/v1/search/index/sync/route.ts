import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { searchIndexerService } from '@/features/search/services/search-indexer.service';

export const dynamic = 'force-dynamic';

const SyncIndexSchema = z.object({
  productId: z.string().optional(),
  productIds: z.array(z.string().min(1)).optional(),
}).refine((data) => data.productId || (data.productIds && data.productIds.length > 0), {
  message: 'Either productId or productIds must be provided.',
});

/**
 * POST /api/v1/search/index/sync
 * Incrementally synchronizes one or more products to the search index.
 */
export async function POST(req: NextRequest) {
  try {
    let actor;
    try {
      actor = authenticateRequest(req);
    } catch {
      actor = undefined;
    }

    const body = await req.json();
    const validatedInput = SyncIndexSchema.parse(body);

    let result;
    if (validatedInput.productId) {
      result = await searchIndexerService.syncProductIndex(validatedInput.productId);
    } else if (validatedInput.productIds) {
      result = await searchIndexerService.syncProductsBatch(validatedInput.productIds);
    }

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
