import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import {
  createRideInstanceSchema,
  rideInstancesQuerySchema,
} from '@/lib/features/ride-instances/ride-instances.schemas';
import { rideInstancesService } from '@/lib/features/ride-instances/ride-instances.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * GET /api/admin/ride-instances
 * Returns paginated ride instances with computed seat availability.
 * Access: admin, sub_admin.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAdminAuth(request);
    const query = rideInstancesQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    logStep('validated ride instances query');

    const data = await rideInstancesService.list(query);
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
 * POST /api/admin/ride-instances
 * Creates one ride instance for a specific route/date/departure.
 * Access: admin, sub_admin.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    requireAdminAuth(request);
    const body = createRideInstanceSchema.parse(rawBody);
    logStep('validated ride instance create payload');

    const data = await rideInstancesService.create(body);
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
