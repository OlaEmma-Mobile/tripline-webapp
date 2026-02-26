import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { updateRideInstanceSchema } from '@/lib/features/ride-instances/ride-instances.schemas';
import { rideInstancesService } from '@/lib/features/ride-instances/ride-instances.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * PATCH /api/admin/ride-instances/:id
 * Updates ride instance metadata/status.
 * Access: admin, sub_admin.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    requireAdminAuth(request);
    const body = updateRideInstanceSchema.parse(rawBody);
    logStep('validated ride instance update payload');

    const { id } = await context.params;
    const data = await rideInstancesService.update(id, body);
    logOutgoing(200, data);
    return jsonResponse(data, 'Ride instance updated', 'Ride instance updated successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse(
        'Invalid request payload',
        'Please fix the highlighted fields',
        400,
        errors
      );
    }
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only admin roles can access this resource'
          : 'Unable to update ride instance';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to update ride instance' });
    return errorResponse('Unable to update ride instance', 'Unexpected server error', 500);
  }
}

/**
 * DELETE /api/admin/ride-instances/:id
 * Soft-cancels a ride instance by setting status to cancelled.
 * Access: admin, sub_admin.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAdminAuth(request);
    const { id } = await context.params;
    const result = await rideInstancesService.deleteOrCancel(id);
    logOutgoing(200, result);
    if (result.action === 'deleted') {
      return jsonResponse(result, 'Ride instance deleted', 'Cancelled ride instance deleted successfully');
    }
    return jsonResponse(result, 'Ride instance cancelled', 'Ride instance cancelled successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only admin roles can access this resource'
          : 'Unable to cancel ride instance';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to cancel ride instance' });
    return errorResponse('Unable to cancel ride instance', 'Unexpected server error', 500);
  }
}
