import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { routesService } from '@/lib/features/routes/routes.service';
import { updateRouteSchema } from '@/lib/features/routes/routes.schemas';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { ZodError } from 'zod';

/**
 * GET /api/admin/routes/[id]
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id } = await context.params;
    const data = await routesService.getRoute(id);
    return jsonResponse(data, 'Route fetched', 'Route details retrieved');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch route';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch route', 'Unexpected server error', 500);
  }
}

/**
 * PATCH /api/admin/routes/[id]
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id } = await context.params;
    const body = updateRouteSchema.parse(await request.json());
    const data = await routesService.updateRoute(id, body);
    return jsonResponse(data, 'Route updated', 'Route has been updated successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, zodErrorToFieldErrors(error));
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to update route';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to update route', 'Unexpected server error', 500);
  }
}

/**
 * DELETE /api/admin/routes/[id]
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id } = await context.params;
    await routesService.deleteRoute(id);
    return jsonResponse({ deleted: true }, 'Route deleted', 'Route has been deleted');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to delete route';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to delete route', 'Unexpected server error', 500);
  }
}
