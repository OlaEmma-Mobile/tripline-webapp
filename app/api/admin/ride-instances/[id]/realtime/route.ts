import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { rideInstancesRepository } from '@/lib/features/ride-instances/ride-instances.repository';
import { getFirebaseDb } from '@/lib/firebase/admin';
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

    const snapshot = (await getFirebaseDb().ref(`realtime/rides/${id}`).get()) as {
      exists(): boolean;
      val?: () => unknown;
    };
    const value = (snapshot.val?.() ?? null) as
      | {
          status?: string;
          driverOnline?: boolean;
          location?: { lat?: number; lng?: number };
        }
      | null;

    return jsonResponse(
      {
        rideInstanceId: id,
        status: value?.status ?? null,
        driverOnline: value?.driverOnline ?? false,
        location: {
          lat: value?.location?.lat ?? null,
          lng: value?.location?.lng ?? null,
        },
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

    const ride = id ? await rideInstancesRepository.getById(id).catch(() => null) : null;

    // Graceful fallback so past rides remain monitorable even when Firebase projection is absent/unavailable.
    return jsonResponse(
      {
        rideInstanceId: id,
        status: ride?.status ?? null,
        driverOnline: false,
        location: {
          lat: null,
          lng: null,
        },
      },
      'Realtime state unavailable',
      'Realtime data is unavailable for this ride; showing manifest-only view'
    );
  }
}
