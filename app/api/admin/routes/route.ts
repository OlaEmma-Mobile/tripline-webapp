import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { createRouteSchema, routesQuerySchema } from '@/lib/features/routes/routes.schemas';
import { routesService } from '@/lib/features/routes/routes.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { ZodError } from 'zod';

/**
 * GET /api/admin/routes
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const parsed = routesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    const data = await routesService.listRoutes({
      page: parsed.page,
      limit: parsed.limit,
      status: parsed.status,
      companyId: parsed.companyId,
    });

    return jsonResponse(data, 'Routes fetched', 'Routes list retrieved');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, zodErrorToFieldErrors(error));
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch routes';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch routes', 'Unexpected server error', 500);
  }
}

/**
 * POST /api/admin/routes
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const body = createRouteSchema.parse(await request.json());
    const data = await routesService.createRoute(body);
    return jsonResponse(data, 'Route created', 'Route has been created successfully', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, zodErrorToFieldErrors(error));
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to create route';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to create route', 'Unexpected server error', 500);
  }
}
