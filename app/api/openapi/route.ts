import { NextRequest, NextResponse } from 'next/server';
import { getOpenApiDocument } from '@/lib/docs/openapi';

/**
 * GET /api/openapi
 * Returns the OpenAPI specification used by Swagger UI.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.nextUrl.origin;
  return NextResponse.json(getOpenApiDocument(origin));
}
