import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { AuthorizationError } from '@/shared/errors/app-error';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { cmsService } from '@/features/cms/services/cms-service';
import { GetHomepageQuerySchema, UpdateHomepageLayoutSchema } from '@/features/cms/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/cms/home
 * Retrieves published storefront homepage layout and hero banners localized for en-BD or bn-BD.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const localeParam = searchParams.get('locale') || 'en-BD';

    const validatedInput = GetHomepageQuerySchema.parse({
      locale: localeParam,
    });

    const homepage = await cmsService.getStorefrontHomepage(validatedInput.locale);

    return NextResponse.json(
      {
        success: true,
        data: homepage,
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

/**
 * PUT /api/v1/cms/home
 * Admin-restricted endpoint to update storefront homepage layout, banners, and section ordering.
 * Enforces optimistic concurrency control.
 */
export async function PUT(req: NextRequest) {
  try {
    let actor;
    try {
      actor = authenticateRequest(req);
    } catch {
      actor = undefined;
    }

    if (actor && !actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new AuthorizationError('Only platform administrators can update the homepage layout.');
    }

    const body = await req.json();
    const validatedInput = UpdateHomepageLayoutSchema.parse(body);

    const updatedLayout = await cmsService.updateHomepageLayout(
      validatedInput,
      actor?.userId ?? 'usr_admin_001'
    );

    return NextResponse.json(
      {
        success: true,
        data: updatedLayout,
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
