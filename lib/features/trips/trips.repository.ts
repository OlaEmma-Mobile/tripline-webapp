import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type { TripAvailabilityRecord, TripRecord } from './trips.types';

interface TripRowWithRelations extends TripAvailabilityRecord {
  driver?: { id: string; first_name: string; last_name: string; email: string; phone: string | null } | null;
  vehicle?: { id: string; registration_number: string; model: string | null; capacity: number } | null;
}

export class TripsRepository {
  async create(input: {
    rideInstanceId: string;
    assignmentId: string;
    driverId: string;
    vehicleId: string;
    driverTripId: string;
    status?: TripRecord['status'];
  }): Promise<TripRecord> {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .insert({
        ride_instance_id: input.rideInstanceId,
        assignment_id: input.assignmentId,
        driver_id: input.driverId,
        vehicle_id: input.vehicleId,
        driver_trip_id: input.driverTripId,
        status: input.status ?? 'scheduled',
      })
      .select('*')
      .single<TripRecord>();

    if (error?.code === '23505') {
      throw new AppError('Trip already exists for this driver assignment', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to create trip', 500);
    }
    return data;
  }

  async getByAssignmentId(assignmentId: string): Promise<TripRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .select('*')
      .eq('assignment_id', assignmentId)
      .maybeSingle<TripRecord>();
    if (error) throw new AppError('Unable to fetch trip', 500);
    return data ?? null;
  }

  async getByRideDriver(rideInstanceId: string, driverId: string): Promise<TripRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .select('*')
      .eq('ride_instance_id', rideInstanceId)
      .eq('driver_id', driverId)
      .in('status', ['scheduled', 'boarding', 'departed'])
      .order('created_at', { ascending: false })
      .maybeSingle<TripRecord>();
    if (error) throw new AppError('Unable to fetch trip', 500);
    return data ?? null;
  }

  async cancelByAssignmentId(assignmentId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('trips')
      .update({ status: 'cancelled' })
      .eq('assignment_id', assignmentId)
      .in('status', ['scheduled', 'boarding', 'departed']);
    if (error) throw new AppError('Unable to cancel trip', 500);
  }

  async listAvailableByRideInstanceIds(rideInstanceIds: string[]): Promise<Record<string, TripAvailabilityRecord[]>> {
    if (rideInstanceIds.length === 0) return {};
    const { data, error } = await supabaseAdmin
      .from('trip_availability')
      .select('*')
      .in('ride_instance_id', rideInstanceIds)
      .in('status', ['scheduled', 'boarding'])
      .gt('available_seats', 0)
      .order('departure_time', { ascending: true })
      .returns<TripAvailabilityRecord[]>();
    if (error) throw new AppError('Unable to fetch trips', 500);

    const out: Record<string, TripAvailabilityRecord[]> = {};
    for (const row of data ?? []) {
      if (!out[row.ride_instance_id]) out[row.ride_instance_id] = [];
      out[row.ride_instance_id].push(row);
    }
    return out;
  }

  async listByRideInstanceId(rideInstanceId: string): Promise<TripAvailabilityRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('trip_availability')
      .select('*')
      .eq('ride_instance_id', rideInstanceId)
      .order('created_at', { ascending: true })
      .returns<TripAvailabilityRecord[]>();
    if (error) throw new AppError('Unable to fetch trips', 500);
    return data ?? [];
  }

  async getById(id: string): Promise<TripAvailabilityRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('trip_availability')
      .select('*')
      .eq('id', id)
      .maybeSingle<TripAvailabilityRecord>();
    if (error) throw new AppError('Unable to fetch trip', 500);
    return data ?? null;
  }

  async listDetailedByRideInstanceId(rideInstanceId: string): Promise<TripRowWithRelations[]> {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .select(
        'id, trip_id, driver_trip_id, ride_instance_id, driver_id, vehicle_id, status, created_at, updated_at, ride_instance:ride_instances(ride_id, route_id, ride_date, departure_time, time_slot)'
      )
      .eq('ride_instance_id', rideInstanceId)
      .order('created_at', { ascending: true })
      .returns<
        Array<
          Pick<
            TripRecord,
            'id' | 'trip_id' | 'driver_trip_id' | 'ride_instance_id' | 'driver_id' | 'vehicle_id' | 'status' | 'created_at' | 'updated_at'
          > & {
            ride_instance: {
              ride_id: string;
              route_id: string;
              ride_date: string;
              departure_time: string;
              time_slot: 'morning' | 'afternoon' | 'evening';
            } | null;
          }
        >
      >();
    if (error) throw new AppError('Unable to fetch trips for ride instance', 500);

    const trips = data ?? [];
    if (trips.length === 0) return [];

    const driverIds = [...new Set(trips.map((trip) => trip.driver_id))];
    const vehicleIds = [...new Set(trips.map((trip) => trip.vehicle_id))];
    const tripIds = trips.map((trip) => trip.id);

    const [
      { data: drivers, error: driversError },
      { data: vehicles, error: vehiclesError },
      { data: bookingCounts, error: bookingCountsError },
    ] =
      await Promise.all([
        supabaseAdmin.from('users').select('id, first_name, last_name, email, phone').in('id', driverIds),
        supabaseAdmin
          .from('vehicles')
          .select('id, registration_number, model, capacity')
          .in('id', vehicleIds),
        supabaseAdmin
          .from('bookings')
          .select('trip_id, seat_count, status, lock_expires_at')
          .in('trip_id', tripIds),
      ]);

    if (driversError) throw new AppError('Unable to fetch trip drivers', 500);
    if (vehiclesError) throw new AppError('Unable to fetch trip vehicles', 500);
    if (bookingCountsError) throw new AppError('Unable to fetch trip booking counts', 500);

    const driversById = new Map((drivers ?? []).map((driver: any) => [driver.id, driver]));
    const vehiclesById = new Map((vehicles ?? []).map((vehicle: any) => [vehicle.id, vehicle]));
    const reservationCountsByTripId = new Map<string, number>();

    for (const booking of bookingCounts ?? []) {
      const status = String(booking.status ?? '');
      const lockExpiresAt = booking.lock_expires_at ? new Date(String(booking.lock_expires_at)) : null;
      const shouldCount =
        ['confirmed', 'booked', 'boarded', 'no_show', 'completed'].includes(status) ||
        (status === 'pending' && lockExpiresAt !== null && lockExpiresAt > new Date());

      if (!shouldCount) continue;
      const current = reservationCountsByTripId.get(String(booking.trip_id)) ?? 0;
      reservationCountsByTripId.set(String(booking.trip_id), current + Number(booking.seat_count ?? 0));
    }

    return trips.map((trip) => ({
      id: trip.id,
      trip_id: trip.trip_id,
      driver_trip_id: trip.driver_trip_id,
      ride_instance_id: trip.ride_instance_id,
      ride_id: trip.ride_instance?.ride_id ?? '',
      route_id: trip.ride_instance?.route_id ?? '',
      driver_id: trip.driver_id,
      vehicle_id: trip.vehicle_id,
      ride_date: trip.ride_instance?.ride_date ?? '',
      departure_time: trip.ride_instance?.departure_time ?? '',
      time_slot: trip.ride_instance?.time_slot ?? 'morning',
      status: trip.status,
      capacity: vehiclesById.get(trip.vehicle_id)?.capacity ?? 0,
      reserved_seats: reservationCountsByTripId.get(trip.id) ?? 0,
      available_seats: Math.max(
        (vehiclesById.get(trip.vehicle_id)?.capacity ?? 0) - (reservationCountsByTripId.get(trip.id) ?? 0),
        0
      ),
      created_at: trip.created_at,
      updated_at: trip.updated_at,
      driver: driversById.get(trip.driver_id) ?? null,
      vehicle: vehiclesById.get(trip.vehicle_id) ?? null,
    }));
  }
}

export const tripsRepository = new TripsRepository();
