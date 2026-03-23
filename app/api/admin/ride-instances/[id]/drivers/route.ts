import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { assignRideInstanceDriversSchema } from '@/lib/features/assignments/assignments.schemas';
import { assignmentsService } from '@/lib/features/assignments/assignments.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * GET /api/admin/ride-instances/:id/drivers
 * Returns active driver assignments for a ride instance.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAdminAuth(request);
    const { id } = await context.params;
    const data = await assignmentsService.listRideDrivers(id);
    logOutgoing(200, data);
    return jsonResponse(data, 'Ride drivers fetched', 'Ride driver assignments retrieved successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only admin roles can access this resource'
          : error.status === 404
            ? 'Ride instance not found'
            : 'Unable to fetch ride drivers';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch ride drivers' });
    return errorResponse('Unable to fetch ride drivers', 'Unexpected server error', 500);
  }
}

/**
 * POST /api/admin/ride-instances/:id/drivers
 * Assigns one or more drivers to a ride instance.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    requireAdminAuth(request);
    const { id } = await context.params;
    const body = assignRideInstanceDriversSchema.parse({
      rideInstanceId: id,
      driverIds: rawBody.driverIds,
    });
    logStep('validated ride driver assignment payload');

    const data = await assignmentsService.assignRideDrivers(body);
    logOutgoing(200, data);
    return jsonResponse(data, 'Drivers assigned', 'Drivers assigned to ride successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only admin roles can access this resource'
          : 'Unable to assign drivers to ride';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to assign drivers to ride' });
    return errorResponse('Unable to assign drivers to ride', 'Unexpected server error', 500);
  }
}
