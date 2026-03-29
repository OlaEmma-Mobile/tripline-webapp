import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { respondBoardingSchema } from '@/lib/features/bookings/bookings.schemas';
import { bookingsService } from '@/lib/features/bookings/bookings.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * @openapi
 * /api/bookings/{id}/boarding/respond:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Approve or decline a boarding request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BoardingRespondRequest'
 *     responses:
 *       '200':
 *         description: Boarding response recorded
 *         content:
 *           application/json:
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
 *         description: Invalid response payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '401':
 *         description: Missing token or wrong passcode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '403':
 *         description: Booking does not belong to the rider
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '409':
 *         description: Boarding request expired or booking is no longer boardable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, {
      allowedRoles: ['rider'],
      forbiddenMessage: 'Only riders can respond to boarding requests',
    });
    const rawBody = await request.json();
    const body = respondBoardingSchema.parse(rawBody);
    const { id } = await context.params;

    const data = await bookingsService.respondToBoarding({
      bookingId: id,
      riderId: auth.userId,
      decision: body.decision,
      passcode: body.passcode,
      declineReason: body.declineReason,
    });

    return jsonResponse(data, 'Boarding response recorded', 'Boarding response processed successfully');
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
            ? 'Only the rider for this booking can respond'
            : error.status === 404
              ? 'Booking was not found'
              : error.status === 409
                ? 'Boarding request is not active or booking is no longer boardable'
                : 'Unable to process boarding response';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to process boarding response', 'Unexpected server error', 500);
  }
}
