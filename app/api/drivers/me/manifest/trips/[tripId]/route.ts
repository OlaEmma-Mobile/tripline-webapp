import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { driversService } from '@/lib/features/drivers/drivers.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

const paramsSchema = z.object({
  tripId: z.string().uuid('Trip id must be a valid UUID'),
});

/**
 * @openapi
 * /api/drivers/me/manifest/trips/{tripId}:
 *   get:
 *     tags:
 *       - Driver Manifests
 *     summary: Fetch a driver's manifest for one trip
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Trip UUID
 *     responses:
 *       '200':
 *         description: Driver manifest returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/DriverManifestDetail'
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
 *         description: Driver can only access their own trip manifest
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
  context: { params: Promise<{ tripId: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver'],
      forbiddenMessage: 'Only drivers can access manifests',
    });

    const { tripId } = await context.params;
    const parsed = paramsSchema.parse({ tripId });

    const data = await driversService.getManifestDetailsByTrip(auth.userId, parsed.tripId);
    return jsonResponse(data, 'Manifest fetched', 'Driver trip manifest retrieved successfully');
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
        error.status === 403
          ? 'Drivers can only access their own trip manifest'
          : error.status === 404
            ? 'Trip not found'
            : error.status === 401
              ? error.message === 'Unauthorized'
                ? 'Authorization token is required'
                : 'Invalid or expired token'
              : 'Unable to fetch driver manifest';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to fetch driver manifest', 'Unexpected server error', 500);
  }
}
