import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import {
  assertDriverOwnsPathUser,
  isManifestPassengerStatus,
} from '@/lib/features/drivers/driver-booking-auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

const manifestQuerySchema = z.object({
  date: z
    .string({ required_error: 'Date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

interface ManifestPassengerRow {
  id: string;
  rider_id: string;
  status: string;
  rider: {
    first_name: string;
    last_name: string;
  } | null;
}

interface ManifestRideRow {
  id: string;
  departure_time: string;
  route: {
    name: string;
  } | null;
  vehicle: {
    registration_number: string;
  } | null;
  bookings: ManifestPassengerRow[] | null;
}

/**
 * GET /api/drivers/:id/manifest?date=YYYY-MM-DD
 * Returns driver manifest grouped by ride instance for a specific date.
 * Access: driver (self only).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    logIncoming(request);

    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver'],
      forbiddenMessage: 'Only drivers can access manifests',
    });

    const { id: pathDriverId } = await context.params;
    assertDriverOwnsPathUser(auth.userId, pathDriverId);

    const query = manifestQuerySchema.parse({
      date: request.nextUrl.searchParams.get('date'),
    });
    logStep('validated manifest query');

    const { data, error } = await supabaseAdmin
      .from('ride_instances')
      .select(
        'id, departure_time, route:routes(name), vehicle:vehicles(registration_number), bookings(id, rider_id, status, rider:users!bookings_rider_id_fkey(first_name, last_name))'
      )
      .eq('driver_id', pathDriverId)
      .eq('ride_date', query.date)
      .in('status', ['scheduled', 'boarding'])
      .order('departure_time', { ascending: true })
      .returns<ManifestRideRow[]>();

    if (error) {
      throw new AppError('Unable to fetch driver manifest', 500);
    }

    const rides = (data ?? []).map((ride) => ({
      ride_instance_id: ride.id,
      route_name: ride.route?.name ?? 'Unknown route',
      departure_time: ride.departure_time,
      vehicle_plate: ride.vehicle?.registration_number ?? 'Unknown vehicle',
      passengers: (ride.bookings ?? [])
        .filter((booking) => isManifestPassengerStatus(booking.status))
        .map((booking) => ({
          booking_id: booking.id,
          user_id: booking.rider_id,
          user_name: `${booking.rider?.first_name ?? ''} ${booking.rider?.last_name ?? ''}`.trim(),
          pickup_point_id: null as string | null,
          status: booking.status,
        })),
    }));

    const responseData = {
      date: query.date,
      rides,
    };

    logOutgoing(200, responseData);
    return jsonResponse(responseData, 'Manifest fetched', 'Driver manifest retrieved successfully');
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
          ? 'Drivers can only access their own manifest'
          : error.status === 401
            ? error.message === 'Unauthorized'
              ? 'Authorization token is required'
              : 'Invalid or expired token'
            : 'Unable to fetch driver manifest';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }

    logOutgoing(500, { error: 'Unable to fetch driver manifest' });
    return errorResponse('Unable to fetch driver manifest', 'Unexpected server error', 500);
  }
}
