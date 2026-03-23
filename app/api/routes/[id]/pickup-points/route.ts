import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { pickupPointsService } from '@/lib/features/pickup-points/pickup-points.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * GET /api/routes/:id/pickup-points
 * Returns pickup points for a route (rider-facing).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAccessAuth(request);
    const { id } = await context.params;
    const data = await pickupPointsService.listPickupPoints(id);
    return jsonResponse(data, 'Pickup points fetched', 'Pickup points retrieved successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : 'Unable to fetch pickup points';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch pickup points', 'Unexpected server error', 500);
  }
}
