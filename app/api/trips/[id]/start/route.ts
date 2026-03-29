import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { tripsService } from '@/lib/features/trips/trips.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * @openapi
 * /api/trips/{id}/start:
 *   post:
 *     tags:
 *       - Trips
 *     summary: Start a scheduled trip
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
 *         description: Trip started
 *         content:
 *           application/json:
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
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '403':
 *         description: Only the assigned driver can start this trip
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '404':
 *         description: Trip not found
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
      allowedRoles: ['driver'],
      forbiddenMessage: 'Only drivers can start trips',
    });
    const { id } = await context.params;
    const data = await tripsService.startTrip(id, { userId: auth.userId, role: auth.role ?? '' });
    return jsonResponse(data, 'Trip started', 'Trip started successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : error.status === 403
            ? 'Only the assigned driver can start this trip'
            : error.status === 404
              ? 'Trip not found'
              : 'Unable to start trip';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to start trip', 'Unexpected server error', 500);
  }
}
