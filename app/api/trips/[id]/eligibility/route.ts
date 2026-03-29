import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { tripsService } from '@/lib/features/trips/trips.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * @openapi
 * /api/trips/{id}/eligibility:
 *   get:
 *     tags:
 *       - Trips
 *     summary: Get trip completion eligibility
 *     description: Returns trip completion eligibility derived from realtime telemetry and destination proximity checks.
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
 *     responses:
 *       '200':
 *         description: Trip eligibility returned
 *         content:
 *           application/json:
 *             example:
 *               hasError: false
 *               data:
 *                 tripId: 3e6cdff1-f76d-4df1-b0f2-6185c4f96988
 *                 completionEligibility:
 *                   eligible: false
 *                   readyToComplete: false
 *                   nearDestination: true
 *                   withinDwellWindow: false
 *                   durationThresholdMet: true
 *                   gpsFresh: true
 *                   distanceToDestinationMeters: 142
 *                   lastLocationAt: '2026-03-28T08:12:00.000Z'
 *                 realtime:
 *                   tripId: 3e6cdff1-f76d-4df1-b0f2-6185c4f96988
 *                   rideInstanceId: 98e42e2d-6805-46fd-927f-4aa30dc42a16
 *                   driverId: 29b42e3b-5651-471f-9848-6bbf54fb8b17
 *                   status: ongoing
 *                   driverOnline: true
 *                   location:
 *                     lat: 6.4462
 *                     lng: 3.4061
 *                     updatedAt: '2026-03-28T08:12:00.000Z'
 *                   eligibility:
 *                     readyToComplete: false
 *                     distanceToDestinationMeters: 142
 *                     updatedAt: '2026-03-28T08:12:00.000Z'
 *               message: Trip eligibility fetched
 *               description: Trip completion eligibility retrieved successfully
 *               errors: {}
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     tripId:
 *                       type: string
 *                       format: uuid
 *                     completionEligibility:
 *                       $ref: '#/components/schemas/TripCompletionEligibility'
 *                     realtime:
 *                       $ref: '#/components/schemas/TripRealtimeSnapshot'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '401':
 *         description: Missing or invalid token
 *       '403':
 *         description: Caller is not allowed to access the trip
 *       '404':
 *         description: Trip not found
 *       '500':
 *         description: Unexpected server error
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver', 'rider', 'admin', 'sub_admin'],
      forbiddenMessage: 'Only authenticated users can access trip eligibility',
    });
    const { id } = await context.params;
    const [completionEligibility, realtime] = await Promise.all([
      tripsService.getCompletionEligibility(id, { userId: auth.userId, role: auth.role ?? '' }),
      tripsService.getRealtimeSnapshot(id),
    ]);

    return jsonResponse(
      {
        tripId: id,
        completionEligibility,
        realtime,
      },
      'Trip eligibility fetched',
      'Trip completion eligibility retrieved successfully'
    );
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : error.status === 403
            ? 'You are not allowed to access this trip eligibility'
            : error.status === 404
              ? 'Trip not found'
              : 'Unable to fetch trip eligibility';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch trip eligibility', 'Unexpected server error', 500);
  }
}
