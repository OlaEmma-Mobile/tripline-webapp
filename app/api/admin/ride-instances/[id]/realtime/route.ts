import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { tripsService } from '@/lib/features/trips/trips.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * GET /api/admin/ride-instances/[id]/realtime
 * Reads realtime ride projection from Firebase for admin live monitoring.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  let id = '';
  try {
    requireAdminAuth(request);
    ({ id } = await context.params);

    const trips = await tripsService.listByRideInstanceId(id);
    const activeTrip =
      trips.find((trip) => trip.status === 'ongoing') ??
      trips.find((trip) => trip.status === 'scheduled') ??
      trips[0] ??
      null;

    const [realtime, completionEligibility] = activeTrip
      ? await Promise.all([
          tripsService.getRealtimeSnapshot(activeTrip.id),
          tripsService.getCompletionEligibility(activeTrip.id).catch(() => null),
        ])
      : [null, null];

    return jsonResponse(
      {
        rideInstanceId: id,
        tripId: activeTrip?.id ?? null,
        status: realtime?.status ?? activeTrip?.status ?? null,
        driverOnline: realtime?.driverOnline ?? false,
        location: {
          lat: realtime?.location.lat ?? null,
          lng: realtime?.location.lng ?? null,
          updatedAt: realtime?.location.updatedAt ?? null,
        },
        eligibility: completionEligibility,
      },
      'Realtime state fetched',
      'Realtime ride state retrieved successfully'
    );
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only admin roles can access this resource'
          : 'Unable to fetch realtime ride state';
      return errorResponse(error.message, description, error.status);
    }

    // Graceful fallback so past rides remain monitorable even when Firebase projection is absent/unavailable.
    return jsonResponse(
      {
        rideInstanceId: id,
        tripId: null,
        status: null,
        driverOnline: false,
        location: {
          lat: null,
          lng: null,
          updatedAt: null,
        },
        eligibility: null,
      },
      'Realtime state unavailable',
      'Realtime data is unavailable for this ride; showing manifest-only view'
    );
  }
}
