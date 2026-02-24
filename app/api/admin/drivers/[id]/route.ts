import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { updateDriverSchema } from '@/lib/features/drivers/drivers.schemas';
import { driversService } from '@/lib/features/drivers/drivers.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * GET /api/admin/drivers/[id]
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
    const data = await driversService.getById(id);
    logOutgoing(200, data);
    return jsonResponse(data, 'Driver fetched', 'Driver details retrieved');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch driver';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch driver' });
    return errorResponse('Unable to fetch driver', 'Unexpected server error', 500);
  }
}

/**
 * PATCH /api/admin/drivers/[id]
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
    const body = updateDriverSchema.parse(rawBody);
    logStep('validated driver update payload');

    const { id } = await context.params;
    const data = await driversService.update(id, body);
    logOutgoing(200, data);
    return jsonResponse(data, 'Driver updated', 'Driver profile updated successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to update driver';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to update driver' });
    return errorResponse('Unable to update driver', 'Unexpected server error', 500);
  }
}

/**
 * DELETE /api/admin/drivers/[id]
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
    await driversService.softDelete(id);
    const data = { deleted: true };
    logOutgoing(200, data);
    return jsonResponse(data, 'Driver deleted', 'Driver deactivated successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to delete driver';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to delete driver' });
    return errorResponse('Unable to delete driver', 'Unexpected server error', 500);
  }
}
