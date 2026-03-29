import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rideInstancesService } from '@/lib/features/ride-instances/ride-instances.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

const availabilityQuerySchema = z.object({
  date: z.string().date('date query must be in YYYY-MM-DD format'),
});

/**
 * @openapi
 * /api/routes/{id}/availability:
 *   get:
 *     tags:
 *       - Public Routes
 *     summary: Get route availability for a date
 *     description: Returns route ride instances with their bookable trips and seat availability for the specified service date.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Route UUID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Service date in YYYY-MM-DD format
 *     responses:
 *       '200':
 *         description: Route availability returned
 *         content:
 *           application/json:
 *             example:
 *               hasError: false
 *               data:
 *                 - id: 98e42e2d-6805-46fd-927f-4aa30dc42a16
 *                   rideId: TL-1042
 *                   routeId: 71462dd5-8f63-4fe5-88ca-4d460d7330cc
 *                   vehicleId: 51083d8a-379f-47c5-971d-7e4731db7d2f
 *                   rideDate: '2026-03-31'
 *                   departureTime: null
 *                   timeSlot: morning
 *                   status: scheduled
 *                   createdAt: '2026-03-27T06:00:00.000Z'
 *                   updatedAt: '2026-03-27T06:00:00.000Z'
 *                   trips:
 *                     - id: 3e6cdff1-f76d-4df1-b0f2-6185c4f96988
 *                       tripId: TRIP-1042-A
 *                       driverTripId: DRV-1042-A
 *                       status: scheduled
 *                       departureTime: '06:30:00'
 *                       estimatedDurationMinutes: 65
 *                       capacity: 14
 *                       reservedSeats: 4
 *                       availableSeats: 10
 *               message: Route availability fetched
 *               description: Route availability retrieved
 *               errors: {}
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RouteAvailabilityItem'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '400':
 *         description: Invalid route availability query
 *         content:
 *           application/json:
 *             example:
 *               hasError: true
 *               data: null
 *               message: Invalid request payload
 *               description: Please fix the highlighted fields
 *               errors:
 *                 date:
 *                   - date query must be in YYYY-MM-DD format
 *       '404':
 *         description: Route not found
 *       '500':
 *         description: Unexpected server error
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    logIncoming(request);
    const { id } = await context.params;
    const query = availabilityQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    logStep('validated route availability query', { routeId: id, date: query.date });

    const data = await rideInstancesService.getRouteAvailability(id, query.date);
    logOutgoing(200, data);
    return jsonResponse(data, 'Route availability fetched', 'Route availability retrieved');
  } catch (error) {
    if (error instanceof z.ZodError) {
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
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'Unable to fetch route availability', error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch route availability' });
    return errorResponse('Unable to fetch route availability', 'Unexpected server error', 500);
  }
}
