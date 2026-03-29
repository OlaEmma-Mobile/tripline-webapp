import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { rideInstancesService } from '@/lib/features/ride-instances/ride-instances.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * @openapi
 * /api/ride-instances/{id}:
 *   get:
 *     tags:
 *       - Ride Instances
 *     summary: Get ride instance details
 *     description: Returns rider-facing ride instance details with route, drivers, assigned vehicle, pickup points, and bookable trips.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ride instance UUID
 *     responses:
 *       '200':
 *         description: Ride instance details returned
 *         content:
 *           application/json:
 *             example:
 *               hasError: false
 *               data:
 *                 id: 98e42e2d-6805-46fd-927f-4aa30dc42a16
 *                 rideId: TL-1042
 *                 rideDate: '2026-03-31'
 *                 timeSlot: morning
 *                 status: scheduled
 *                 route:
 *                   id: 71462dd5-8f63-4fe5-88ca-4d460d7330cc
 *                   name: Chevron to Marina
 *                   from_name: Chevron
 *                   to_name: Marina
 *                   from_latitude: 6.4312
 *                   from_longitude: 3.5351
 *                   to_latitude: 6.4488
 *                   to_longitude: 3.4019
 *                 drivers:
 *                   - id: 29b42e3b-5651-471f-9848-6bbf54fb8b17
 *                     driver_trip_id: DRV-1042-A
 *                     first_name: Chinedu
 *                     last_name: Obi
 *                     phone: '+2348011111111'
 *                     email: chinedu@example.com
 *                 vehicle:
 *                   id: 51083d8a-379f-47c5-971d-7e4731db7d2f
 *                   registration_number: KSF-245GX
 *                   model: Toyota Hiace
 *                   capacity: 14
 *                 capacity: 14
 *                 reservedSeats: 4
 *                 availableSeats: 10
 *                 trips:
 *                   - id: 3e6cdff1-f76d-4df1-b0f2-6185c4f96988
 *                     tripId: TRIP-1042-A
 *                     driverTripId: DRV-1042-A
 *                     status: scheduled
 *                     departureTime: '06:30:00'
 *                     estimatedDurationMinutes: 65
 *                     capacity: 14
 *                     reservedSeats: 4
 *                     availableSeats: 10
 *                 pickupPoints:
 *                   - id: 8bb2bf31-74b8-49d4-a286-d87807fa56da
 *                     name: Jakande Roundabout
 *                     latitude: 6.4352
 *                     longitude: 3.5402
 *                     orderIndex: 1
 *                     tokenCost: 3
 *               message: Ride instance fetched
 *               description: Ride instance retrieved successfully
 *               errors: {}
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/RiderRideInstanceDetail'
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
 *             example:
 *               hasError: true
 *               data: null
 *               message: Unauthorized
 *               description: Authorization token is required
 *               errors: {}
 *       '404':
 *         description: Ride instance not found
 *       '500':
 *         description: Unexpected server error
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAccessAuth(request);
    const { id } = await context.params;
    const data = await rideInstancesService.getRiderDetails(id);
    return jsonResponse(data, 'Ride instance fetched', 'Ride instance retrieved successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : error.status === 404
            ? 'Ride instance not found'
            : 'Unable to fetch ride instance';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch ride instance', 'Unexpected server error', 500);
  }
}
