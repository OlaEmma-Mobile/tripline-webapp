import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminOpsService } from '@/lib/features/admin-ops/admin-ops.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * @openapi
 * /api/admin/ride-instances/{id}/details:
 *   get:
 *     tags:
 *       - Admin Ride Instances
 *     summary: Fetch full admin ride-template details
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
 *         description: Ride template details returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/AdminRideInstanceDetails'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '403':
 *         description: Only admin roles can access this resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '404':
 *         description: Ride instance not found
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
    requireAdminAuth(request);
    const { id } = await context.params;
    const data = await adminOpsService.getRideInstanceDetails(id);
    return jsonResponse(data, 'Ride details fetched', 'Ride instance details retrieved successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only admin roles can access this resource'
          : error.status === 404
            ? 'Ride instance not found'
            : 'Unable to fetch ride instance details';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch ride instance details', 'Unexpected server error', 500);
  }
}
