import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { routesQuerySchema } from '@/lib/features/routes/routes.schemas';
import { routesService } from '@/lib/features/routes/routes.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * @openapi
 * /api/routes:
 *   get:
 *     tags:
 *       - Public Routes
 *     summary: List public routes
 *     description: Returns public route listings for the marketing site with pickup-point counts.
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [available, coming_soon]
 *       - in: query
 *         name: companyId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Public routes returned
 *         content:
 *           application/json:
 *             example:
 *               hasError: false
 *               data:
 *                 items:
 *                   - id: 71462dd5-8f63-4fe5-88ca-4d460d7330cc
 *                     name: Chevron to Marina
 *                     fromName: Chevron
 *                     toName: Marina
 *                     fromLatitude: 6.4312
 *                     fromLongitude: 3.5351
 *                     toLatitude: 6.4488
 *                     toLongitude: 3.4019
 *                     companyId: null
 *                     baseTokenCost: 3
 *                     status: available
 *                     pickupPointsCount: 4
 *                     createdAt: '2026-03-20T06:00:00.000Z'
 *                     updatedAt: '2026-03-25T06:00:00.000Z'
 *                 total: 1
 *               message: Routes fetched
 *               description: Public route list retrieved
 *               errors: {}
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/RouteListResponseData'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '400':
 *         description: Invalid query string
 *         content:
 *           application/json:
 *             example:
 *               hasError: true
 *               data: null
 *               message: Invalid request payload
 *               description: Please fix the highlighted fields
 *               errors:
 *                 page:
 *                   - Number must be greater than or equal to 1
 *       '500':
 *         description: Unexpected server error
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const parsed = routesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    const data = await routesService.listRoutes({
      page: parsed.page,
      limit: parsed.limit,
      status: parsed.status,
      companyId: parsed.companyId,
    });

    return jsonResponse(data, 'Routes fetched', 'Public route list retrieved');
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
      return errorResponse(error.message, 'Unable to fetch routes', error.status);
    }
    return errorResponse('Unable to fetch routes', 'Unexpected server error', 500);
  }
}
