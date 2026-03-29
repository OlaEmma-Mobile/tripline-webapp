import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { driverLocationUpdateSchema } from '@/lib/features/drivers/drivers.schemas';
import { tripsService } from '@/lib/features/trips/trips.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * PATCH /api/drivers/location
 * Writes driver trip telemetry to Firebase through the backend relay.
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
    logStep('validated driver trip location payload');

    const data = await tripsService.updateRealtimeLocation({
      tripId: body.tripId,
      actorUserId: auth.userId,
      actorRole: auth.role ?? '',
      lat: body.lat,
      lng: body.lng,
      driverOnline: body.driverOnline,
      recordedAt: body.recordedAt,
    });

    logOutgoing(200, data);
    return jsonResponse(data, 'Location updated', 'Driver location synced to realtime trip channel');
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
          ? 'You are not assigned to update this trip location'
          : error.status === 409
            ? 'Trip is not active for location updates'
            : error.status === 401
              ? error.message === 'Unauthorized'
                ? 'Authorization token is required'
                : 'Invalid or expired token'
              : 'Unable to update driver location';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('FIREBASE_DATABASE_URL') ? 503 : 500;
    const description =
      status === 503 ? 'Realtime service is temporarily unavailable' : 'Unexpected server error';
    logOutgoing(status, { error: message });
    return errorResponse('Unable to update driver location', description, status);
  }
}

export async function GET(): Promise<NextResponse> {
  return jsonResponse(
    {
      deprecated: false,
      writePath: '/api/drivers/location',
      writableFields: ['tripId', 'lat', 'lng', 'driverOnline', 'recordedAt'],
    },
    'Driver location API available',
    'Send driver trip telemetry to the backend relay for secure Firebase updates.'
  );
}
