import { NextRequest, NextResponse } from 'next/server';
import { routesService } from '@/lib/features/routes/routes.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * @openapi
 * /api/routes/{id}:
 *   get:
 *     tags:
 *       - Public Routes
 *     summary: Get public route details
 *     description: Returns public route details with ordered pickup points.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Route UUID
 *     responses:
 *       '200':
 *         description: Route details returned
 *         content:
 *           application/json:
 *             example:
 *               hasError: false
 *               data:
 *                 id: 71462dd5-8f63-4fe5-88ca-4d460d7330cc
 *                 name: Chevron to Marina
 *                 fromName: Chevron
 *                 toName: Marina
 *                 fromLatitude: 6.4312
 *                 fromLongitude: 3.5351
 *                 toLatitude: 6.4488
 *                 toLongitude: 3.4019
 *                 companyId: null
 *                 baseTokenCost: 3
 *                 status: available
 *                 createdAt: '2026-03-20T06:00:00.000Z'
 *                 updatedAt: '2026-03-25T06:00:00.000Z'
 *                 pickupPoints:
 *                   - id: 8bb2bf31-74b8-49d4-a286-d87807fa56da
 *                     name: Jakande Roundabout
 *                     latitude: 6.4352
 *                     longitude: 3.5402
 *                     orderIndex: 1
 *                     tokenCost: 3
 *               message: Route fetched
 *               description: Public route details retrieved
 *               errors: {}
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/PublicRouteDetail'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '404':
 *         description: Route not found
 *         content:
 *           application/json:
 *             example:
 *               hasError: true
 *               data: null
 *               message: Route not found
 *               description: Unable to fetch route
 *               errors: {}
 *       '500':
 *         description: Unexpected server error
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const data = await routesService.getRoute(id);
    return jsonResponse(data, 'Route fetched', 'Public route details retrieved');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.message, 'Unable to fetch route', error.status);
    }
    return errorResponse('Unable to fetch route', 'Unexpected server error', 500);
  }
}
