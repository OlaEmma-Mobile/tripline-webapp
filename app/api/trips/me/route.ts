import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

const tripsQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  status: z.enum(['ongoing_rides', 'booked_rides', 'past_rides']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

function isRiderHistoryMatch(
  filter: 'ongoing_rides' | 'booked_rides' | 'past_rides' | undefined,
  item: any
): boolean {
  if (!filter) return true;

  const tripStatus = String(item.trip?.status ?? '');
  const bookingStatus = String(item.status ?? '');

  if (filter === 'ongoing_rides') {
    return tripStatus === 'ongoing' && bookingStatus !== 'cancelled' && bookingStatus !== 'expired';
  }

  if (filter === 'booked_rides') {
    return (
      ['scheduled', 'awaiting_driver'].includes(tripStatus) &&
      ['pending', 'confirmed', 'booked'].includes(bookingStatus)
    );
  }

  return (
    ['completed', 'cancelled'].includes(tripStatus) ||
    ['boarded', 'no_show', 'cancelled', 'expired'].includes(bookingStatus)
  );
}

/**
 * GET /api/trips/me
 * Returns trip history for drivers and riders using trip-first response naming.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request);
    const query = tripsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    const today = new Date();
    const to = query.to ?? today.toISOString().slice(0, 10);
    const from = query.from ?? new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    if (auth.role === 'driver') {
      let tripQuery = supabaseAdmin
        .from('trip_availability')
        .select(
          'id, trip_id, driver_trip_id, ride_instance_id, ride_id, ride_date, departure_time, estimated_duration_minutes, time_slot, status, capacity, reserved_seats, available_seats, route:routes(id, name, from_name, to_name, from_latitude, from_longitude, to_latitude, to_longitude), vehicle:vehicles(registration_number)',
          { count: 'exact' }
        )
        .eq('driver_id', auth.userId)
        .gte('ride_date', from)
        .lte('ride_date', to);

      if (query.status === 'ongoing_rides') tripQuery = tripQuery.eq('status', 'ongoing');
      if (query.status === 'booked_rides') tripQuery = tripQuery.in('status', ['scheduled', 'awaiting_driver']);
      if (query.status === 'past_rides') tripQuery = tripQuery.in('status', ['completed', 'cancelled']);

      const fromIdx = (query.page - 1) * query.limit;
      const toIdx = fromIdx + query.limit - 1;

      const { data, error, count } = await tripQuery
        .order('ride_date', { ascending: false })
        .order('departure_time', { ascending: false })
        .range(fromIdx, toIdx);

      if (error) {
        throw new AppError('Unable to fetch trip history', 500);
      }

      return jsonResponse(
        {
          role: 'driver',
          total: count ?? 0,
          items:
            (data ?? []).map((item: any) => ({
              id: item.id,
              tripId: item.trip_id,
              driverTripId: item.driver_trip_id,
              status: item.status,
              capacity: item.capacity,
              reservedSeats: item.reserved_seats,
              availableSeats: item.available_seats,
              vehiclePlate: item.vehicle?.registration_number ?? null,
              rideInstance: {
                id: item.ride_instance_id,
                rideId: item.ride_id,
                rideDate: item.ride_date,
                departureTime: item.departure_time,
                estimatedDurationMinutes: item.estimated_duration_minutes,
                timeSlot: item.time_slot,
                route: item.route
                  ? {
                      id: item.route.id,
                      name: item.route.name,
                      fromName: item.route.from_name,
                      toName: item.route.to_name,
                      fromLat: item.route.from_latitude,
                      fromLng: item.route.from_longitude,
                      toLat: item.route.to_latitude,
                      toLng: item.route.to_longitude,
                    }
                  : null,
              },
            })),
        },
        'Trip history fetched',
        'Driver trip history retrieved successfully'
      );
    }

    if (auth.role === 'rider') {
      const { data: tripRows, error: tripFilterError } = await supabaseAdmin
        .from('trip_availability')
        .select('id')
        .gte('ride_date', from)
        .lte('ride_date', to);

      if (tripFilterError) {
        throw new AppError('Unable to fetch trip history', 500);
      }

      const tripIds = (tripRows ?? []).map((row: any) => row.id);
      if (tripIds.length === 0) {
        return jsonResponse(
          { role: 'rider', total: 0, items: [] },
          'Trip history fetched',
          'Rider trip history retrieved successfully'
        );
      }

      const bookingQuery = supabaseAdmin
        .from('bookings')
        .select(
          'id, status, seat_count, token_cost, created_at, trip:trips(id, trip_id, driver_trip_id, departure_time, estimated_duration_minutes, status, vehicle_id, ride_instance:ride_instances(id, ride_id, ride_date, time_slot, route:routes(id, name, from_name, to_name, from_latitude, from_longitude, to_latitude, to_longitude)), vehicle:vehicles(registration_number, capacity))',
          { count: 'exact' }
        )
        .eq('rider_id', auth.userId)
        .in('trip_id', tripIds);

      const fromIdx = (query.page - 1) * query.limit;
      const toIdx = fromIdx + query.limit - 1;

      const { data, error } = await bookingQuery.order('created_at', { ascending: false });

      if (error) {
        throw new AppError('Unable to fetch trip history', 500);
      }

      const filteredItems = (data ?? []).filter((item: any) =>
        isRiderHistoryMatch(query.status, item)
      );
      const pagedItems = filteredItems.slice(fromIdx, toIdx + 1);

      return jsonResponse(
        {
          role: 'rider',
          total: filteredItems.length,
          items:
            pagedItems.map((item: any) => ({
              bookingId: item.id,
              status: item.status,
              seatCount: item.seat_count,
              tokenCost: item.token_cost,
              bookedAt: item.created_at,
              trip: item.trip
                ? {
                    id: item.trip.id,
                    tripId: item.trip.trip_id,
                    driverTripId: item.trip.driver_trip_id,
                    departureTime: item.trip.departure_time,
                    estimatedDurationMinutes: item.trip.estimated_duration_minutes,
                    status: item.trip.status,
                    vehiclePlate: item.trip.vehicle?.registration_number ?? null,
                    capacity: item.trip.vehicle?.capacity ?? null,
                  }
                : null,
              rideInstance: item.trip?.ride_instance
                ? {
                    id: item.trip.ride_instance.id,
                    rideId: item.trip.ride_instance.ride_id,
                    rideDate: item.trip.ride_instance.ride_date,
                    timeSlot: item.trip.ride_instance.time_slot,
                    route: item.trip.ride_instance.route
                      ? {
                          id: item.trip.ride_instance.route.id,
                          name: item.trip.ride_instance.route.name,
                          fromName: item.trip.ride_instance.route.from_name,
                          toName: item.trip.ride_instance.route.to_name,
                          fromLat: item.trip.ride_instance.route.from_latitude,
                          fromLng: item.trip.ride_instance.route.from_longitude,
                          toLat: item.trip.ride_instance.route.to_latitude,
                          toLng: item.trip.ride_instance.route.to_longitude,
                        }
                      : null,
                  }
                : null,
            })),
        },
        'Trip history fetched',
        'Rider trip history retrieved successfully'
      );
    }

    throw new AppError('Only riders and drivers can access trip history', 403);
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        'Invalid request payload',
        'Please fix the highlighted fields',
        400,
        zodErrorToFieldErrors(error)
      );
    }

    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : error.status === 403
            ? 'Only riders and drivers can access trip history'
            : 'Unable to fetch trip history';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to fetch trip history', 'Unexpected server error', 500);
  }
}
