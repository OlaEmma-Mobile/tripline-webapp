import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { verifyBoardingPasscodeSchema } from '@/lib/features/bookings/bookings.schemas';
import { bookingsService } from '@/lib/features/bookings/bookings.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * POST /api/trips/:id/boarding/:bookingId/verify-passcode
 * Driver verifies the rider's passcode to finalize boarding.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; bookingId: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver'],
      forbiddenMessage: 'Only drivers can verify boarding passcodes',
    });
    const rawBody = await request.json();
    const body = verifyBoardingPasscodeSchema.parse(rawBody);
    const { id, bookingId } = await context.params;

    const data = await bookingsService.verifyBoardingPasscode({
      tripId: id,
      bookingId,
      driverId: auth.userId,
      passcode: body.passcode,
    });

    return jsonResponse(data, 'Boarding verified', 'Rider passcode verified and boarding completed successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        'Invalid request payload',
        'Please fix the highlighted fields',
        400,
        zodErrorToFieldErrors(error)
      );
    }

    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Ride passcode is incorrect'
          : error.status === 403
            ? 'Only the assigned driver for this trip can verify boarding'
            : error.status === 404
              ? 'Trip or booking was not found'
              : error.status === 409
                ? 'Boarding request is not active or booking is no longer boardable'
                : error.status === 400
                  ? 'Booking does not belong to this trip'
                  : 'Unable to verify rider passcode';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to verify rider passcode', 'Unexpected server error', 500);
  }
}
