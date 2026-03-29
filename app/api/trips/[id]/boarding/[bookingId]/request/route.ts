import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { bookingsService } from '@/lib/features/bookings/bookings.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * @openapi
 * /api/trips/{id}/boarding/{bookingId}/request:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Request rider boarding confirmation
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
 *     responses:
 *       '200':
 *         description: Boarding verification requested
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
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '403':
 *         description: Only the assigned driver can request boarding
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '404':
 *         description: Trip or booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '409':
 *         description: Trip is not ongoing or booking cannot be boarded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; bookingId: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver'],
      forbiddenMessage: 'Only drivers can request boarding verification',
    });
    const { id, bookingId } = await context.params;

    const data = await bookingsService.requestBoarding({
      tripId: id,
      bookingId,
      driverId: auth.userId,
    });

    return jsonResponse(data, 'Boarding requested', 'Rider boarding confirmation requested successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : error.status === 403
            ? 'Only the assigned driver for this trip can request boarding'
            : error.status === 404
              ? 'Trip or booking was not found'
              : error.status === 409
                ? 'Trip must be ongoing and booking must still be boardable'
                : error.status === 400
                  ? 'Booking does not belong to this trip'
                  : 'Unable to request boarding verification';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to request boarding verification', 'Unexpected server error', 500);
  }
}
