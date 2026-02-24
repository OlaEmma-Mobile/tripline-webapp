import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { bookingsService } from '@/lib/features/bookings/bookings.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { logIncoming, logOutgoing } from '@/lib/utils/logger';

/**
 * GET /api/bookings/me
 * Returns current rider bookings with minimal ride instance details.
 * Access: rider.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    logIncoming(request);
    const auth = requireAccessAuth(request, {
      allowedRoles: ['rider'],
      forbiddenMessage: 'Only riders can view bookings',
    });
    const data = await bookingsService.listMyBookings(auth.userId);
    logOutgoing(200, data);
    return jsonResponse(data, 'Bookings fetched', 'Rider bookings retrieved');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only riders can access this resource'
          : error.status === 401
            ? error.message === 'Unauthorized'
              ? 'Authorization token is required'
              : 'Invalid or expired token'
            : 'Unable to fetch bookings';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch bookings' });
    return errorResponse('Unable to fetch bookings', 'Unexpected server error', 500);
  }
}
