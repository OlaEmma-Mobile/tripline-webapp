import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { bookingsService } from '@/lib/features/bookings/bookings.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { logIncoming, logOutgoing } from '@/lib/utils/logger';

/**
 * POST /api/bookings/:id/cancel
 * Cancels a rider-owned booking (pending or confirmed).
 * Access: rider.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    logIncoming(request);
    const auth = requireAccessAuth(request, {
      allowedRoles: ['rider'],
      forbiddenMessage: 'Only riders can cancel bookings',
    });
    const { id } = await context.params;
    const data = await bookingsService.cancelBooking(id, auth.userId);
    logOutgoing(200, data);
    return jsonResponse(data, 'Booking cancelled', 'Booking cancelled successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only riders can access this resource'
          : error.status === 401
            ? error.message === 'Unauthorized'
              ? 'Authorization token is required'
              : 'Invalid or expired token'
            : 'Unable to cancel booking';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to cancel booking' });
    return errorResponse('Unable to cancel booking', 'Unexpected server error', 500);
  }
}
