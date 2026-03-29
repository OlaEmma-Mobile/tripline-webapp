import { NextRequest, NextResponse } from 'next/server';
import { routesService } from '@/lib/features/routes/routes.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * GET /api/routes/:id
 * Returns public route details with pickup points.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const data = await routesService.getRoute(id);
    return jsonResponse(data, 'Route fetched', 'Public route details retrieved');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.message, 'Unable to fetch route', error.status);
    }
    return errorResponse('Unable to fetch route', 'Unexpected server error', 500);
  }
}
