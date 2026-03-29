import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { batchBoardingSchema } from '@/lib/features/bookings/bookings.schemas';
import { bookingsService } from '@/lib/features/bookings/bookings.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * PATCH /api/ride-instances/:id/boarding
 * Batch update passenger no-show statuses for a ride instance.
 * Access: driver only.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver'],
      forbiddenMessage: 'Only drivers can update boarding status',
    });

    const body = batchBoardingSchema.parse(rawBody);
    const { id } = await context.params;

    const data = await bookingsService.markDriverBoardingBatch(
      id,
      auth.userId,
      body.updates.map((item) => ({
        bookingId: item.bookingId,
        status: item.status,
      }))
    );

    return jsonResponse(
      { rideInstanceId: id, updated: data },
      'Boarding updated',
      'Passenger no-show statuses updated successfully'
    );
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
        error.status === 403
          ? 'Only assigned drivers can update this ride'
          : error.status === 404
            ? 'Ride or booking not found'
            : error.status === 400
              ? 'Booking does not belong to this ride instance'
              : error.status === 422
                ? 'NO_SHOW cannot be marked before departure grace period'
                : 'Unable to update no-show statuses';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to update no-show statuses', 'Unexpected server error', 500);
  }
}
