import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { verifyBoardingPasscodeSchema } from '@/lib/features/bookings/bookings.schemas';
import { bookingsService } from '@/lib/features/bookings/bookings.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * @openapi
 * /api/trips/{id}/boarding/{bookingId}/verify-passcode:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Verify a rider boarding passcode
 *     description: Driver verifies the rider passcode to complete boarding without rider approval from their phone.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Trip UUID
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             passcode: '1234'
 *           schema:
 *             $ref: '#/components/schemas/VerifyBoardingPasscodeRequest'
 *     responses:
 *       '200':
 *         description: Boarding verified successfully
 *         content:
 *           application/json:
 *             example:
 *               hasError: false
 *               data:
 *                 bookingId: d693a722-a903-48a0-9262-7e0baacf54e2
 *                 bookingStatus: boarded
 *                 boardingStatus: approved
 *                 boardingExpiresAt: null
 *                 boardingVerificationMethod: passcode
 *               message: Boarding verified
 *               description: Rider passcode verified and boarding completed successfully
 *               errors: {}
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/BoardingActionResult'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '400':
 *         description: Invalid request or booking-trip mismatch
 *         content:
 *           application/json:
 *             example:
 *               hasError: true
 *               data: null
 *               message: Booking does not belong to this trip
 *               description: Booking does not belong to this trip
 *               errors: {}
 *       '401':
 *         description: Missing token or incorrect passcode
 *         content:
 *           application/json:
 *             example:
 *               hasError: true
 *               data: null
 *               message: Ride passcode is incorrect
 *               description: Ride passcode is incorrect
 *               errors: {}
 *       '403':
 *         description: Only the assigned driver for the trip can verify boarding
 *       '404':
 *         description: Trip or booking not found
 *       '409':
 *         description: Booking is not in a boardable state
 *       '500':
 *         description: Unexpected server error
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
