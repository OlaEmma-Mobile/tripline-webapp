import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { routeSearchQuerySchema } from '@/lib/features/routes/routes.schemas';
import { routesService } from '@/lib/features/routes/routes.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { ZodError } from 'zod';

/**
 * GET /api/admin/routes/search
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const query = routeSearchQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    const data = await routesService.searchRoutes({
      q: query.q,
      status: query.status,
      companyId: query.companyId,
      limit: query.limit,
    });

    return jsonResponse(data, 'Routes search fetched', 'Search results retrieved');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, zodErrorToFieldErrors(error));
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to search routes';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to search routes', 'Unexpected server error', 500);
  }
}
