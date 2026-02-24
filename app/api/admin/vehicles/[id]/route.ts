import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { updateVehicleSchema } from '@/lib/features/vehicles/vehicles.schemas';
import { vehiclesService } from '@/lib/features/vehicles/vehicles.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * GET /api/admin/vehicles/[id]
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
    const data = await vehiclesService.getById(id);
    logOutgoing(200, data);
    return jsonResponse(data, 'Vehicle fetched', 'Vehicle details retrieved');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch vehicle';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch vehicle' });
    return errorResponse('Unable to fetch vehicle', 'Unexpected server error', 500);
  }
}

/**
 * PATCH /api/admin/vehicles/[id]
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
    const body = updateVehicleSchema.parse(rawBody);
    logStep('validated vehicle update payload');

    const { id } = await context.params;
    const data = await vehiclesService.update(id, body);
    logOutgoing(200, data);
    return jsonResponse(data, 'Vehicle updated', 'Vehicle updated successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to update vehicle';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to update vehicle' });
    return errorResponse('Unable to update vehicle', 'Unexpected server error', 500);
  }
}

/**
 * DELETE /api/admin/vehicles/[id]
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
    await vehiclesService.softDelete(id);
    const data = { deleted: true };
    logOutgoing(200, data);
    return jsonResponse(data, 'Vehicle deleted', 'Vehicle deactivated successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to delete vehicle';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to delete vehicle' });
    return errorResponse('Unable to delete vehicle', 'Unexpected server error', 500);
  }
}
