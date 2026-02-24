import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { lockSeatSchema } from '@/lib/features/bookings/bookings.schemas';
import { bookingsService } from '@/lib/features/bookings/bookings.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/bookings/lock
 * Creates or refreshes a temporary seat lock for a rider.
 * Access: rider.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const auth = requireAccessAuth(request, {
      allowedRoles: ['rider'],
      forbiddenMessage: 'Only riders can lock seats',
    });
    const body = lockSeatSchema.parse(rawBody);
    logStep('validated lock seat payload');

    const data = await bookingsService.lockSeat(
      {
        rideInstanceId: body.rideInstanceId,
        seatCount: body.seatCount,
      },
      auth.userId
    );
    logOutgoing(200, data);
    return jsonResponse(data, 'Seat locked', 'Seat lock created successfully');
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
        error.status === 409
          ? 'Requested seats are not available or lock is no longer valid'
          : error.status === 403
            ? 'Only riders can access this resource'
            : error.status === 401
              ? error.message === 'Unauthorized'
                ? 'Authorization token is required'
                : 'Invalid or expired token'
              : 'Unable to lock seat';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to lock seat' });
    return errorResponse('Unable to lock seat', 'Unexpected server error', 500);
  }
}
