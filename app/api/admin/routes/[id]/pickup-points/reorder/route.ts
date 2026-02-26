import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { reorderPickupPointsSchema } from '@/lib/features/pickup-points/pickup-points.schemas';
import { pickupPointsService } from '@/lib/features/pickup-points/pickup-points.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * PATCH /api/admin/routes/[id]/pickup-points/reorder
 * Reorders pickup points for a route in one transactional operation.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id } = await context.params;
    const body = reorderPickupPointsSchema.parse(await request.json());
    const data = await pickupPointsService.reorderPickupPoints(id, body.items);
    return jsonResponse(data, 'Pickup points reordered', 'Pickup point sequence updated successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, zodErrorToFieldErrors(error));
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to reorder pickup points';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to reorder pickup points', 'Unexpected server error', 500);
  }
}
