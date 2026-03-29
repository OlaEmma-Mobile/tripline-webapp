import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import {
  createRideInstanceRequestSchema,
  rideInstancesQuerySchema,
} from '@/lib/features/ride-instances/ride-instances.schemas';
import { rideInstancesService } from '@/lib/features/ride-instances/ride-instances.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * @openapi
 * /api/admin/ride-instances:
 *   get:
 *     tags:
 *       - Admin Ride Instances
 *     summary: List admin ride templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Ride templates returned
 *         content:
 *           application/json:
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
 *                         $ref: '#/components/schemas/AdminRideInstanceListItem'
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
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
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAdminAuth(request);
    const query = rideInstancesQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    logStep('validated ride instances query');

    const data = await rideInstancesService.listAdmin(query);
    logOutgoing(200, data);
    return jsonResponse(data, 'Ride instances fetched', 'Ride instances list retrieved');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse(
        'Invalid request payload',
        'Please fix the highlighted fields',
        400,
        errors
      );
    }
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only admin roles can access this resource'
          : 'Unable to fetch ride instances';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch ride instances' });
    return errorResponse('Unable to fetch ride instances', 'Unexpected server error', 500);
  }
}

/**
 * @openapi
 * /api/admin/ride-instances:
 *   post:
 *     tags:
 *       - Admin Ride Instances
 *     summary: Create one or more ride templates for a date
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRideInstanceRequest'
 *     responses:
 *       '201':
 *         description: Ride template created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/AdminRideInstanceListItem'
 *                     - type: array
 *                       items:
 *                         $ref: '#/components/schemas/AdminRideInstanceListItem'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '400':
 *         description: Invalid creation payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '403':
 *         description: Only admin roles can access this resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    requireAdminAuth(request);
    const body = createRideInstanceRequestSchema.parse(rawBody);
    logStep('validated ride instance create payload');

    const data = body.timeSlots.length === 1
      ? await rideInstancesService.create({
          routeId: body.routeId,
          rideDate: body.rideDate,
          timeSlot: body.timeSlots[0],
          status: body.status,
        })
      : await rideInstancesService.createForSlots(body);
    logOutgoing(201, data);
    return jsonResponse(data, 'Ride instance created', 'Ride instance created successfully', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse(
        'Invalid request payload',
        'Please fix the highlighted fields',
        400,
        errors
      );
    }
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only admin roles can access this resource'
          : 'Unable to create ride instance';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to create ride instance' });
    return errorResponse('Unable to create ride instance', 'Unexpected server error', 500);
  }
}
