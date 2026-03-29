import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { createBookingSchema } from '@/lib/features/bookings/bookings.schemas';
import { bookingsService } from '@/lib/features/bookings/bookings.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Create a booking for a trip
 *     description: Books a scheduled trip, stores pickup point coordinates on the booking, and deducts rider tokens atomically.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookingRequest'
 *     responses:
 *       '201':
 *         description: Booking created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/CreateBookingResult'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '400':
 *         description: Invalid booking payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '403':
 *         description: Only riders can create bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '409':
 *         description: Trip is not bookable or rider lacks capacity/tokens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const auth = requireAccessAuth(request, {
      allowedRoles: ['rider'],
      forbiddenMessage: 'Only riders can create bookings',
    });

    const body = createBookingSchema.parse(rawBody);
    logStep('validated booking create payload');

    const data = await bookingsService.createBooking(
      {
        tripId: body.tripId,
        pickupPointId: body.pickupPointId,
        seatCount: body.seatCount,
      },
      auth.userId
    );

    logOutgoing(201, data);
    return jsonResponse(data, 'Booking created', 'Booking created and tokens deducted', 201);
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
          ? 'Insufficient tokens, unavailable seats, or ride not open for booking'
          : error.status === 403
            ? 'Only riders can access this resource'
            : error.status === 401
              ? error.message === 'Unauthorized'
                ? 'Authorization token is required'
                : 'Invalid or expired token'
              : 'Unable to create booking';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to create booking' });
    return errorResponse('Unable to create booking', 'Unexpected server error', 500);
  }
}
