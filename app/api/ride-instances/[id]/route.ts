import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { rideInstancesService } from '@/lib/features/ride-instances/ride-instances.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * GET /api/ride-instances/:id
 * Returns rider-facing ride instance details with driver, vehicle, availability, and pickup points.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAccessAuth(request);
    const { id } = await context.params;
    const data = await rideInstancesService.getRiderDetails(id);
    return jsonResponse(data, 'Ride instance fetched', 'Ride instance retrieved successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : error.status === 404
            ? 'Ride instance not found'
            : 'Unable to fetch ride instance';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch ride instance', 'Unexpected server error', 500);
  }
}
