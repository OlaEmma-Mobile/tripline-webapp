import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { tripsService } from '@/lib/features/trips/trips.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * @openapi
 * /api/trips/{id}:
 *   get:
 *     tags:
 *       - Trips
 *     summary: Fetch rider-facing trip details
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
 *         description: Trip details returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/RiderTripDetail'
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
 *         description: Only riders can view this endpoint
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
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAccessAuth(request, {
      allowedRoles: ['rider'],
      forbiddenMessage: 'Only riders can view trip details',
    });
    const { id } = await context.params;
    const data = await tripsService.getRiderDetails(id);
    return jsonResponse(data, 'Trip fetched', 'Trip details retrieved successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : error.status === 403
            ? 'Only riders can access this resource'
            : error.status === 404
              ? 'Trip not found'
              : 'Unable to fetch trip details';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch trip details', 'Unexpected server error', 500);
  }
}
