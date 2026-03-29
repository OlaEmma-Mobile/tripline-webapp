import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { tripsService } from '@/lib/features/trips/trips.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * POST /api/trips/:id/complete
 * Completes an ongoing trip for the assigned driver or an admin operator.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver', 'admin', 'sub_admin'],
      forbiddenMessage: 'Only drivers and admins can complete trips',
    });
    const { id } = await context.params;
    const data = await tripsService.completeTrip(id, { userId: auth.userId, role: auth.role ?? '' });
    return jsonResponse(data, 'Trip completed', 'Trip completed successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : error.status === 403
            ? 'Only the assigned driver or an admin can complete this trip'
            : error.status === 404
              ? 'Trip not found'
              : 'Unable to complete trip';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to complete trip', 'Unexpected server error', 500);
  }
}
