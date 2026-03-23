import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { createRideInstanceBulkSchema } from '@/lib/features/ride-instances/ride-instances.schemas';
import { rideInstancesService } from '@/lib/features/ride-instances/ride-instances.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/admin/ride-instances/bulk
 * Creates multiple ride instances for one route/date using multiple departure times.
 * Access: admin, sub_admin.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    requireAdminAuth(request);
    const body = createRideInstanceBulkSchema.parse(rawBody);
    logStep('validated ride instance bulk create payload');
    logStep('creating bulk ride instances', {
      count: body.departureTimes.length,
      routeId: body.routeId,
      rideDate: body.rideDate,
    });

    const data = await rideInstancesService.createBulk(body);
    logOutgoing(201, data);
    return jsonResponse(
      data,
      'Ride instances created',
      'Ride instances created successfully',
      201
    );
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
          : 'Unable to create ride instances';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to create ride instances' });
    return errorResponse('Unable to create ride instances', 'Unexpected server error', 500);
  }
}
