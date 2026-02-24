import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { updatePickupPointSchema } from '@/lib/features/pickup-points/pickup-points.schemas';
import { pickupPointsService } from '@/lib/features/pickup-points/pickup-points.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { ZodError } from 'zod';

/**
 * PATCH /api/admin/routes/[id]/pickup-points/[pickupPointId]
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; pickupPointId: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id, pickupPointId } = await context.params;
    const body = updatePickupPointSchema.parse(await request.json());

    const data = await pickupPointsService.updatePickupPoint(id, pickupPointId, {
      name: body.name,
      latitude: body.latitude,
      longitude: body.longitude,
      orderIndex: body.orderIndex,
      tokenCost: body.tokenCost,
    });

    return jsonResponse(data, 'Pickup point updated', 'Pickup point has been updated');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, zodErrorToFieldErrors(error));
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to update pickup point';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to update pickup point', 'Unexpected server error', 500);
  }
}

/**
 * DELETE /api/admin/routes/[id]/pickup-points/[pickupPointId]
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; pickupPointId: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id, pickupPointId } = await context.params;
    await pickupPointsService.deletePickupPoint(id, pickupPointId);
    return jsonResponse({ deleted: true }, 'Pickup point deleted', 'Pickup point has been deleted');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to delete pickup point';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to delete pickup point', 'Unexpected server error', 500);
  }
}
