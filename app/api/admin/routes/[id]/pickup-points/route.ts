import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { pickupPointsService } from '@/lib/features/pickup-points/pickup-points.service';
import { createPickupPointSchema } from '@/lib/features/pickup-points/pickup-points.schemas';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { ZodError } from 'zod';

/**
 * GET /api/admin/routes/[id]/pickup-points
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id } = await context.params;
    const data = await pickupPointsService.listPickupPoints(id);
    return jsonResponse(data, 'Pickup points fetched', 'Pickup points list retrieved');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch pickup points';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch pickup points', 'Unexpected server error', 500);
  }
}

/**
 * POST /api/admin/routes/[id]/pickup-points
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id } = await context.params;
    const body = createPickupPointSchema.parse(await request.json());
    const data = await pickupPointsService.createPickupPoint({
      routeId: id,
      name: body.name,
      latitude: body.latitude,
      longitude: body.longitude,
      orderIndex: body.orderIndex,
      tokenCost: body.tokenCost,
    });

    return jsonResponse(data, 'Pickup point created', 'Pickup point has been created', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, zodErrorToFieldErrors(error));
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to create pickup point';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to create pickup point', 'Unexpected server error', 500);
  }
}
