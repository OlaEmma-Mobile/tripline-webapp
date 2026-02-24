import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { boardBookingSchema } from '@/lib/features/bookings/bookings.schemas';
import { bookingsService } from '@/lib/features/bookings/bookings.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * PATCH /api/bookings/:id/board
 * Updates boarding outcome for a booking assigned to the authenticated driver.
 * Access: driver.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);

    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver'],
      forbiddenMessage: 'Only drivers can update boarding status',
    });

    const body = boardBookingSchema.parse(rawBody);
    logStep('validated booking boarding payload');

    const { id } = await context.params;
    const data = await bookingsService.markDriverBoarding(
      id,
      auth.userId,
      body.action ?? body.status!
    );

    logOutgoing(200, data);
    return jsonResponse(data, 'Booking updated', 'Boarding status updated successfully');
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
          ? 'Only assigned drivers can update this booking'
          : error.status === 404
            ? 'Booking record was not found'
            : error.status === 422
              ? 'NO_SHOW can only be marked after departure grace period'
              : error.status === 409
                ? 'Booking is not valid for boarding update'
              : error.status === 401
                ? error.message === 'Unauthorized'
                  ? 'Authorization token is required'
                  : 'Invalid or expired token'
                : error.status === 400
                  ? 'Action/status must be BOARDED or NO_SHOW'
                  : 'Unable to update booking status';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }

    logOutgoing(500, { error: 'Unable to update booking status' });
    return errorResponse('Unable to update booking status', 'Unexpected server error', 500);
  }
}
