import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { rideInstancesQuerySchema } from '@/lib/features/ride-instances/ride-instances.schemas';
import { rideInstancesService } from '@/lib/features/ride-instances/ride-instances.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * GET /api/ride-instances
 * Returns rider-facing ride availability list filtered by route/date/status.
 * Access: rider.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAccessAuth(request, {
      allowedRoles: ['rider'],
      forbiddenMessage: 'Only riders can access ride availability',
    });

    const query = rideInstancesQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    logStep('validated rider ride instances query');

    const data = await rideInstancesService.list({
      ...query,
      statuses: query.status ? undefined : ['scheduled'],
    });
    logOutgoing(200, data);
    return jsonResponse(data, 'Ride instances fetched', 'Ride availability retrieved');
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
          ? 'Only riders can access this resource'
          : error.status === 401
            ? error.message === 'Unauthorized'
              ? 'Authorization token is required'
              : 'Invalid or expired token'
            : 'Unable to fetch ride instances';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch ride instances' });
    return errorResponse('Unable to fetch ride instances', 'Unexpected server error', 500);
  }
}
