import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { bulkBookingsService } from '@/lib/features/bulk-bookings/bulk-bookings.service';
import { createBulkBookingRuleSchema } from '@/lib/features/bulk-bookings/bulk-bookings.schemas';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * @openapi
 * /api/bulk-bookings:
 *   get:
 *     tags:
 *       - Bulk Bookings
 *     summary: List recurring bulk-booking rules
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Bulk-booking rules returned
 *         content:
 *           application/json:
 *             example:
 *               hasError: false
 *               data:
 *                 items:
 *                   - id: a0ecb80f-a6fb-4a2f-98fb-b95171b1d3c6
 *                     riderId: 3a51c38e-1a15-4bc4-8c48-a2e80fb85c2f
 *                     routeId: 71462dd5-8f63-4fe5-88ca-4d460d7330cc
 *                     pickupPointId: 8bb2bf31-74b8-49d4-a286-d87807fa56da
 *                     timeSlots: [morning, evening]
 *                     durationType: 2_weeks
 *                     dayMode: working_days
 *                     weekdays: [mon, tue, wed, thu, fri]
 *                     startDate: '2026-03-31'
 *                     endDate: '2026-04-13'
 *                     seatCount: 1
 *                     status: active
 *                     lastProcessedDate: '2026-03-31'
 *                     createdAt: '2026-03-28T07:00:00.000Z'
 *                     updatedAt: '2026-03-28T07:00:00.000Z'
 *               message: Bulk bookings fetched
 *               description: Bulk booking rules retrieved successfully
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
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BulkBookingRule'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '401':
 *         description: Missing token
 *       '403':
 *         description: Only riders can access this resource
 *       '500':
 *         description: Unexpected server error
 *   post:
 *     tags:
 *       - Bulk Bookings
 *     summary: Create a recurring bulk-booking rule
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             routeId: 71462dd5-8f63-4fe5-88ca-4d460d7330cc
 *             pickupPointId: 8bb2bf31-74b8-49d4-a286-d87807fa56da
 *             timeSlots: [morning, evening]
 *             durationType: 2_weeks
 *             dayMode: working_days
 *             startDate: '2026-03-31'
 *             seatCount: 1
 *           schema:
 *             $ref: '#/components/schemas/CreateBulkBookingRuleRequest'
 *     responses:
 *       '201':
 *         description: Bulk-booking rule created
 *         content:
 *           application/json:
 *             example:
 *               hasError: false
 *               data:
 *                 id: a0ecb80f-a6fb-4a2f-98fb-b95171b1d3c6
 *                 riderId: 3a51c38e-1a15-4bc4-8c48-a2e80fb85c2f
 *                 routeId: 71462dd5-8f63-4fe5-88ca-4d460d7330cc
 *                 pickupPointId: 8bb2bf31-74b8-49d4-a286-d87807fa56da
 *                 timeSlots: [morning, evening]
 *                 durationType: 2_weeks
 *                 dayMode: working_days
 *                 weekdays: [mon, tue, wed, thu, fri]
 *                 startDate: '2026-03-31'
 *                 endDate: '2026-04-13'
 *                 seatCount: 1
 *                 status: active
 *                 lastProcessedDate: '2026-03-31'
 *                 createdAt: '2026-03-28T07:00:00.000Z'
 *                 updatedAt: '2026-03-28T07:00:00.000Z'
 *                 occurrences:
 *                   - id: 79df4c81-2b78-4934-888b-4eb54d52a670
 *                     ruleId: a0ecb80f-a6fb-4a2f-98fb-b95171b1d3c6
 *                     serviceDate: '2026-03-31'
 *                     timeSlot: morning
 *                     seatCount: 1
 *                     tripId: 3e6cdff1-f76d-4df1-b0f2-6185c4f96988
 *                     bookingId: d693a722-a903-48a0-9262-7e0baacf54e2
 *                     status: booked
 *                     failureReason: null
 *                     createdAt: '2026-03-28T07:00:00.000Z'
 *                     updatedAt: '2026-03-28T07:00:02.000Z'
 *               message: Bulk booking created
 *               description: Recurring bulk booking created successfully
 *               errors: {}
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/BulkBookingRuleDetail'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '400':
 *         description: Invalid bulk-booking payload
 *       '401':
 *         description: Missing token
 *       '403':
 *         description: Only riders can access this resource
 *       '404':
 *         description: Route or pickup point not found
 *       '500':
 *         description: Unexpected server error
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, { allowedRoles: ['rider'] });
    const data = await bulkBookingsService.listRulesByRider(auth.userId);
    return jsonResponse({ items: data }, 'Bulk bookings fetched', 'Bulk booking rules retrieved successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? 'Authorization token is required'
          : error.status === 403
            ? 'Only riders can access this resource'
            : 'Unable to fetch bulk bookings';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to fetch bulk bookings', 'Unexpected server error', 500);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, { allowedRoles: ['rider'] });
    const body = createBulkBookingRuleSchema.parse(await request.json());
    const data = await bulkBookingsService.createRule(body, auth.userId);
    return jsonResponse(data, 'Bulk booking created', 'Recurring bulk booking created successfully', 201);
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
          ? 'Authorization token is required'
          : error.status === 403
            ? 'Only riders can access this resource'
            : 'Unable to create bulk booking';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to create bulk booking', 'Unexpected server error', 500);
  }
}
