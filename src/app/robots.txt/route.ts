import { NextResponse } from 'next/server';
import { buildRobotsText } from '@/shared/seo/robots';

export function GET() {
  return new NextResponse(buildRobotsText(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
