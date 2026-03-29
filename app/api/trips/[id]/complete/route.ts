import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { tripsService } from '@/lib/features/trips/trips.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

const completeTripSchema = z.object({
  mode: z.enum(['normal', 'override']).optional().default('normal'),
});

/**
 * @openapi
 * /api/trips/{id}/complete:
 *   post:
 *     tags:
 *       - Trips
 *     summary: Complete an ongoing trip
 *     description: Completes an ongoing trip for the assigned driver or an admin operator. Override mode bypasses the normal completion eligibility gate.
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
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           example:
 *             mode: normal
 *           schema:
 *             $ref: '#/components/schemas/TripCompletionRequest'
 *     responses:
 *       '200':
 *         description: Trip completed
 *         content:
 *           application/json:
 *             example:
 *               hasError: false
 *               data:
 *                 id: 3e6cdff1-f76d-4df1-b0f2-6185c4f96988
 *                 tripId: TRIP-1042-A
 *                 driverTripId: DRV-1042-A
 *                 status: completed
 *                 departureTime: '06:30:00'
 *                 estimatedDurationMinutes: 65
 *                 capacity: 14
 *                 reservedSeats: 4
 *                 availableSeats: 10
 *               message: Trip completed
 *               description: Trip completed successfully
 *               errors: {}
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/TripSummary'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '400':
 *         description: Invalid completion payload
 *         content:
 *           application/json:
 *             example:
 *               hasError: true
 *               data: null
 *               message: Invalid request payload
 *               description: Please fix the highlighted fields
 *               errors:
 *                 mode:
 *                   - Invalid enum value. Expected 'normal' | 'override'
 *       '401':
 *         description: Missing or invalid token
 *       '403':
 *         description: Only the assigned driver or an admin can complete this trip
 *       '404':
 *         description: Trip not found
 *       '409':
 *         description: Trip cannot yet be completed
 *         content:
 *           application/json:
 *             example:
 *               hasError: true
 *               data: null
 *               message: Trip is not eligible for completion
 *               description: Trip completion requirements are not yet satisfied
 *               errors:
 *                 completionEligibility:
 *                   - '{"eligible":false,"readyToComplete":false,"nearDestination":true,"withinDwellWindow":false,"durationThresholdMet":true,"gpsFresh":true,"distanceToDestinationMeters":142,"lastLocationAt":"2026-03-28T08:12:00.000Z"}'
 *       '500':
 *         description: Unexpected server error
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver', 'admin', 'sub_admin'],
      forbiddenMessage: 'Only drivers and admins can complete trips',
    });
    const { id } = await context.params;
    const rawBody = await request
      .json()
      .catch(() => ({}));
    const body = completeTripSchema.parse(rawBody);
    const data = await tripsService.completeTrip(
      id,
      { userId: auth.userId, role: auth.role ?? '' },
      body.mode
    );
    return jsonResponse(data, 'Trip completed', 'Trip completed successfully');
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
      const parsedMessage = (() => {
        try {
          return JSON.parse(error.message) as {
            message?: string;
            completionEligibility?: Record<string, unknown>;
          };
        } catch {
          return null;
        }
      })();
      if (parsedMessage?.completionEligibility) {
        return errorResponse(
          parsedMessage.message ?? 'Trip is not eligible for completion',
          'Trip completion requirements are not yet satisfied',
          error.status,
          {
            completionEligibility: [JSON.stringify(parsedMessage.completionEligibility)],
          }
        );
      }
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : error.status === 403
            ? 'Only the assigned driver or an admin can complete this trip'
            : error.status === 404
              ? 'Trip not found'
              : 'Unable to complete trip';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to complete trip', 'Unexpected server error', 500);
  }
}
