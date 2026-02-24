import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { updateProviderSchema } from '@/lib/features/providers/providers.schemas';
import { providersService } from '@/lib/features/providers/providers.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * GET /api/admin/vehicle-providers/[id]
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAdminAuth(request);
    const { id } = await context.params;
    const data = await providersService.getById(id);
    logOutgoing(200, data);
    return jsonResponse(data, 'Provider fetched', 'Vehicle provider details retrieved');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch provider';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch provider' });
    return errorResponse('Unable to fetch provider', 'Unexpected server error', 500);
  }
}

/**
 * PATCH /api/admin/vehicle-providers/[id]
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    requireAdminAuth(request);
    const body = updateProviderSchema.parse(rawBody);
    logStep('validated provider update payload');

    const { id } = await context.params;
    const data = await providersService.update(id, body);
    logOutgoing(200, data);
    return jsonResponse(data, 'Provider updated', 'Vehicle provider updated successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to update provider';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to update provider' });
    return errorResponse('Unable to update provider', 'Unexpected server error', 500);
  }
}

/**
 * DELETE /api/admin/vehicle-providers/[id]
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAdminAuth(request);
    const { id } = await context.params;
    await providersService.softDelete(id);
    const data = { deleted: true };
    logOutgoing(200, data);
    return jsonResponse(data, 'Provider deleted', 'Vehicle provider deactivated successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to delete provider';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to delete provider' });
    return errorResponse('Unable to delete provider', 'Unexpected server error', 500);
  }
}
