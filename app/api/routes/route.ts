import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { routesQuerySchema } from '@/lib/features/routes/routes.schemas';
import { routesService } from '@/lib/features/routes/routes.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * GET /api/routes
 * Returns public route listings for the marketing site.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const parsed = routesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    const data = await routesService.listRoutes({
      page: parsed.page,
      limit: parsed.limit,
      status: parsed.status,
      companyId: parsed.companyId,
    });

    return jsonResponse(data, 'Routes fetched', 'Public route list retrieved');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        'Invalid request payload',
        'Please fix the highlighted fields',
        400,
        zodErrorToFieldErrors(error)
      );
    }
    if (error instanceof AppError) {
      return errorResponse(error.message, 'Unable to fetch routes', error.status);
    }
    return errorResponse('Unable to fetch routes', 'Unexpected server error', 500);
  }
}
