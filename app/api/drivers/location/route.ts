import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { driverLocationUpdateSchema } from '@/lib/features/drivers/drivers.schemas';
import { rideInstancesService } from '@/lib/features/ride-instances/ride-instances.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * PATCH /api/drivers/location
 * Writes driver location to Firebase realtime path for a ride instance.
 * Access: driver, admin, sub_admin.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);

    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver', 'admin', 'sub_admin'],
      forbiddenMessage: 'Only driver/admin roles can update driver location',
    });

    const body = driverLocationUpdateSchema.parse(rawBody);
    logStep('validated driver location payload');

    const data = await rideInstancesService.updateRealtimeLocation({
      rideInstanceId: body.rideInstanceId,
      actorUserId: auth.userId,
      actorRole: auth.role ?? '',
      lat: body.lat,
      lng: body.lng,
      driverOnline: body.driverOnline,
    });

    logOutgoing(200, data);
    return jsonResponse(data, 'Location updated', 'Driver location synced to realtime channel');
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
          ? 'You are not assigned to update this ride location'
          : error.status === 409
            ? 'Ride is not active for location updates'
            : error.status === 401
              ? error.message === 'Unauthorized'
                ? 'Authorization token is required'
                : 'Invalid or expired token'
              : 'Unable to update driver location';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to update driver location' });
    return errorResponse('Unable to update driver location', 'Unexpected server error', 500);
  }
}
