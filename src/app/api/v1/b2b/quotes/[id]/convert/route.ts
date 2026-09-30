import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/b2b/quotes/[id]/convert
 * Converts an ACCEPTED quote to an active Cart with locked negotiated pricing.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const conversion = await b2bCommerceService.convertQuoteToCart(id, actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: conversion,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
