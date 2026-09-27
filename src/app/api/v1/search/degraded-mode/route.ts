import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { AuthorizationError } from '@/shared/errors/app-error';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { searchService } from '@/features/search/services/search-service';

export const dynamic = 'force-dynamic';

const DegradedModeControlSchema = z.object({
  forced: z.boolean(),
  resetCircuit: z.boolean().optional(),
});

/**
 * GET /api/v1/search/degraded-mode
 * Retrieves search subsystem failover telemetry, query counters, and current degraded mode status.
 */
export async function GET(req: NextRequest) {
  try {
    const metrics = searchService.getTelemetryMetrics();
    return NextResponse.json(
      {
        success: true,
        data: metrics,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/search/degraded-mode
 * Admin control to manually enable/disable forced degraded mode or reset circuit breaker.
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
      throw new AuthorizationError('Only platform administrators can configure search degraded mode.');
    }

    const body = await req.json();
    const validatedInput = DegradedModeControlSchema.parse(body);

    searchService.setForcedDegradedMode(validatedInput.forced);

    if (validatedInput.resetCircuit) {
      searchService.resetCircuitBreaker();
    }

    const metrics = searchService.getTelemetryMetrics();

    return NextResponse.json(
      {
        success: true,
        data: metrics,
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
