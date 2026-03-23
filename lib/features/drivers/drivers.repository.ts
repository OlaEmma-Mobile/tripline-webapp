import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type { RideInstanceDriverAssignmentRecord } from '@/lib/features/assignments/assignments.types';
import type {
  CreateDriverInput,
  DriverFilters,
  DriverManifestCountsRow,
  DriverManifestDetailDTO,
  DriverManifestRideRow,
  DriverKycRecordLite,
  DriverRecord,
  DriverVehicleAssignmentProjection,
  UpdateDriverInput,
} from './drivers.types';

interface CreateDriverPersistInput extends Omit<CreateDriverInput, 'password'> {
  passwordHash: string;
}

/**
 * toCreate Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function toCreate(input: CreateDriverPersistInput): Record<string, unknown> {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone ?? null,
    role: 'driver',
    password_hash: input.passwordHash,
    status: input.status ?? 'active',
  };
}

/**
 * toUpdate Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function toUpdate(input: UpdateDriverInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.firstName !== undefined) out.first_name = input.firstName;
  if (input.lastName !== undefined) out.last_name = input.lastName;
  if (input.email !== undefined) out.email = input.email;
  if (input.phone !== undefined) out.phone = input.phone;
  if (input.status !== undefined) out.status = input.status;
  return out;
}

/**
 * Driver persistence over users table.
 */
export class DriversRepository {
  /**
   * Finds actively assigned driver ids for a specific ride date and slot.
   */
  private async getAssignedDriverIdsForDateSlot(
    rideDate: string,
    timeSlot: 'morning' | 'afternoon' | 'evening'
  ): Promise<string[]> {
    const { data: rides, error: ridesError } = await supabaseAdmin
      .from('ride_instances')
      .select('id')
      .eq('ride_date', rideDate)
      .eq('time_slot', timeSlot)
      .returns<Array<{ id: string }>>();

    if (ridesError) {
      throw new AppError('Unable to filter drivers by time slot', 500);
    }

    const rideIds = (rides ?? []).map((ride) => ride.id);
    if (rideIds.length === 0) return [];

    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('ride_instance_driver_assignments')
      .select('driver_id')
      .in('ride_instance_id', rideIds)
      .eq('status', 'active')
      .returns<Array<{ driver_id: string }>>();

    if (assignmentsError) {
      throw new AppError('Unable to filter drivers by time slot', 500);
    }

    return Array.from(new Set((assignments ?? []).map((row) => row.driver_id).filter(Boolean)));
  }

  /**
   * Finds ride instance ids a driver is actively assigned to, optionally for a specific date.
   */
  private async getRideAssignmentsForDriver(
    driverId: string,
    options?: { date?: string; activeOnly?: boolean }
  ): Promise<RideInstanceDriverAssignmentRecord[]> {
    let query = supabaseAdmin
      .from('ride_instance_driver_assignments')
      .select('*')
      .eq('driver_id', driverId)
      .order('assigned_at', { ascending: true });

    if (options?.activeOnly) {
      query = query.eq('status', 'active');
    }

    const { data: assignments, error: assignmentsError } = await query.returns<RideInstanceDriverAssignmentRecord[]>();

    if (assignmentsError) {
      throw new AppError('Unable to fetch driver assignments', 500);
    }

    if (!options?.date) return assignments ?? [];

    const rideIds = (assignments ?? []).map((row) => row.ride_instance_id);
    if (rideIds.length === 0) return [];

    const { data: rides, error: ridesError } = await supabaseAdmin
      .from('ride_instances')
      .select('id')
      .in('id', rideIds)
      .eq('ride_date', options.date)
      .returns<Array<{ id: string }>>();

    if (ridesError) {
      throw new AppError('Unable to fetch driver assignments', 500);
    }

    const eligibleRideIds = new Set((rides ?? []).map((ride) => ride.id));
    return (assignments ?? []).filter((assignment) => eligibleRideIds.has(assignment.ride_instance_id));
  }

  /**
   * Finds drivers with active vehicle assignments.
   */
  private async getDriverIdsWithActiveVehicles(): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .select('driver_id')
      .eq('status', 'active')
      .returns<Array<{ driver_id: string }>>();

    if (error) {
      throw new AppError('Unable to filter drivers by vehicle assignment', 500);
    }

    return Array.from(new Set((data ?? []).map((row) => row.driver_id).filter(Boolean)));
  }

  /**
   * Returns ride context for driver availability filtering.
   */
  private async getRideSlotContext(
    rideInstanceId: string
  ): Promise<{ ride_date: string; time_slot: 'morning' | 'afternoon' | 'evening' } | null> {
    const { data, error } = await supabaseAdmin
      .from('ride_instances')
      .select('ride_date, time_slot')
      .eq('id', rideInstanceId)
      .maybeSingle<{ ride_date: string; time_slot: 'morning' | 'afternoon' | 'evening' }>();

    if (error) {
      throw new AppError('Unable to fetch ride instance context', 500);
    }

    return data ?? null;
  }

  /**
   * Finds actively assigned driver ids for a specific ride instance.
   */
  private async getAssignedDriverIdsForRideInstance(rideInstanceId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('ride_instance_driver_assignments')
      .select('driver_id')
      .eq('ride_instance_id', rideInstanceId)
      .eq('status', 'active')
      .returns<Array<{ driver_id: string }>>();

    if (error) {
      throw new AppError('Unable to fetch assigned ride drivers', 500);
    }

    return Array.from(new Set((data ?? []).map((row) => row.driver_id).filter(Boolean)));
  }

  /** Create a driver user. */
  async create(input: CreateDriverPersistInput): Promise<DriverRecord> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(toCreate(input))
      .select('*')
      .single<DriverRecord>();

    if (error?.code === '23505') {
      throw new AppError('Driver email already exists', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to create driver', 500);
    }

    return data;
  }

  /** List drivers with pagination and filters. */
  async list(filters: DriverFilters): Promise<{ items: DriverRecord[]; total: number }> {
    let query = supabaseAdmin.from('users').select('*', { count: 'exact' }).eq('role', 'driver');

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.q) query = query.or(`first_name.ilike.%${filters.q}%,last_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`);

    const activeVehicleDriverIds =
      filters.rideInstanceId || (filters.rideDate && filters.timeSlot)
        ? await this.getDriverIdsWithActiveVehicles()
        : [];

    if (filters.rideInstanceId) {
      const rideContext = await this.getRideSlotContext(filters.rideInstanceId);
      if (!rideContext) {
        throw new AppError('Ride instance not found', 404);
      }

      const assignedToCurrentRide = await this.getAssignedDriverIdsForRideInstance(filters.rideInstanceId);
      const assignedForSlot = await this.getAssignedDriverIdsForDateSlot(
        rideContext.ride_date,
        rideContext.time_slot
      );
      const excludedIds = new Set([
        ...assignedToCurrentRide,
        ...assignedForSlot.filter((driverId) => !assignedToCurrentRide.includes(driverId)),
      ]);
      const eligibleIds = activeVehicleDriverIds.filter((driverId) => !excludedIds.has(driverId));

      if (eligibleIds.length === 0) {
        return { items: [], total: 0 };
      }

      query = query.in('id', eligibleIds);
    } else if (filters.rideDate && filters.timeSlot) {
      const assignedIds = await this.getAssignedDriverIdsForDateSlot(filters.rideDate, filters.timeSlot);
      const eligibleIds = activeVehicleDriverIds.filter((driverId) => !assignedIds.includes(driverId));
      if (eligibleIds.length === 0) {
        return { items: [], total: 0 };
      }
      query = query.in('id', eligibleIds);
    }

    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;

    const { data, error, count } = await query.order('updated_at', { ascending: false }).range(from, to);

    if (error) {
      throw new AppError('Unable to fetch drivers', 500);
    }

    return { items: (data as DriverRecord[]) ?? [], total: count ?? 0 };
  }

  /** Fetch driver by user id. */
  async getById(id: string): Promise<DriverRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'driver')
      .maybeSingle<DriverRecord>();

    if (error) {
      throw new AppError('Unable to fetch driver', 500);
    }

    return data ?? null;
  }

  /** Update driver profile fields. */
  async update(id: string, input: UpdateDriverInput): Promise<DriverRecord> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(toUpdate(input))
      .eq('id', id)
      .eq('role', 'driver')
      .select('*')
      .single<DriverRecord>();

    if (error?.code === '23505') {
      throw new AppError('Driver email already exists', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to update driver', 500);
    }

    return data;
  }

  /** Deactivate a driver. */
  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('role', 'driver');

    if (error) {
      throw new AppError('Unable to delete driver', 500);
    }
  }

  /** Fetch KYC statuses for a batch of driver ids. */
  async getKycByDriverIds(driverIds: string[]): Promise<Record<string, DriverKycRecordLite['status']>> {
    if (driverIds.length === 0) return {};

    const { data, error } = await supabaseAdmin
      .from('driver_kyc')
      .select('user_id, status')
      .in('user_id', driverIds)
      .returns<Array<{ user_id: string; status: DriverKycRecordLite['status'] }>>();

    if (error) {
      throw new AppError('Unable to fetch driver KYC status', 500);
    }

    const out: Record<string, DriverKycRecordLite['status']> = {};
    for (const row of data ?? []) {
      out[row.user_id] = row.status;
    }
    return out;
  }

  /**
   * Fetch ride manifest rows for a driver and date.
   * @param driverId Driver user id.
   * @param date Ride date (YYYY-MM-DD).
   * @returns Ride rows with route/vehicle and rider booking projections.
   */
  async getManifestRows(driverId: string, date: string): Promise<DriverManifestRideRow[]> {
    const { data, error } = await supabaseAdmin
      .from('trip_availability')
      .select(
        'id, trip_id, ride_instance_id, driver_trip_id, ride_id, ride_date, departure_time, time_slot, status, capacity, route:routes(name, from_name, to_name, from_latitude, from_longitude, to_latitude, to_longitude), vehicle:vehicles(registration_number)'
      )
      .eq('driver_id', driverId)
      .eq('ride_date', date)
      .in('status', ['scheduled', 'boarding'])
      .order('departure_time', { ascending: true })
      .returns<DriverManifestRideRow[]>();

    if (error) {
      throw new AppError('Unable to fetch driver manifest', 500);
    }

    return data ?? [];
  }

  /**
   * Fetch booking counts for ride instances to compute totals.
   */
  async getManifestCounts(tripIds: string[]): Promise<DriverManifestCountsRow[]> {
    if (tripIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('trip_id, status')
      .in('trip_id', tripIds);

    if (error) {
      throw new AppError('Unable to fetch manifest counts', 500);
    }

    const counts: Record<string, { total: number; boarded: number }> = {};
    for (const row of (data ?? []) as Array<{ trip_id: string | null; status: string }>) {
      const key = row.trip_id;
      if (!key) continue;
      if (!counts[key]) counts[key] = { total: 0, boarded: 0 };
      counts[key].total += 1;
      if (row.status === 'boarded') counts[key].boarded += 1;
    }
    return Object.entries(counts).map(([trip_id, value]) => ({
      trip_id,
      total_passengers: value.total,
      total_boarded: value.boarded,
    }));
  }

  /**
   * Fetch the active ride assignment for a driver on a specific ride instance.
   */
  async getActiveRideAssignmentForDriver(
    driverId: string,
    rideInstanceId: string
  ): Promise<RideInstanceDriverAssignmentRecord | null> {
    const assignments = await this.getRideAssignmentsForDriver(driverId, { activeOnly: true });
    return assignments.find((assignment) => assignment.ride_instance_id === rideInstanceId) ?? null;
  }

  /**
   * Fetch full manifest details for a single ride instance belonging to a driver.
   */
  async getManifestDetails(
    driverId: string,
    rideInstanceId: string
  ): Promise<DriverManifestDetailDTO | null> {
    const assignment = await this.getActiveRideAssignmentForDriver(driverId, rideInstanceId);
    if (!assignment) {
      return null;
    }

    const { data: trip, error: tripError } = await supabaseAdmin
      .from('trip_availability')
      .select(
        'id, trip_id, ride_instance_id, driver_trip_id, ride_id, ride_date, departure_time, time_slot, status, capacity, route:routes(name, from_name, to_name, from_latitude, from_longitude, to_latitude, to_longitude), vehicle:vehicles(registration_number)'
      )
      .eq('driver_id', driverId)
      .eq('ride_instance_id', rideInstanceId)
      .maybeSingle<{
        id: string;
        trip_id: string;
        ride_instance_id: string;
        driver_trip_id: string;
        ride_id: string;
        ride_date: string;
        departure_time: string;
        time_slot: string;
        status: string;
        capacity: number;
        route: {
          name: string;
          from_name: string;
          to_name: string;
          from_latitude: number;
          from_longitude: number;
          to_latitude: number;
          to_longitude: number;
        } | null;
        vehicle: { registration_number: string } | null;
      }>();

    if (tripError) {
      throw new AppError('Unable to fetch driver manifest details', 500);
    }
    if (!trip || !trip.route) {
      return null;
    }

    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(
        'id, rider_id, status, pickup_point:pickup_points(id, name), rider:users!bookings_rider_id_fkey(first_name, last_name)'
      )
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: true })
      .returns<
        Array<{
          id: string;
          rider_id: string;
          status: string;
          pickup_point: { id: string; name: string } | null;
          rider: { first_name: string; last_name: string } | null;
        }>
      >();

    if (bookingsError) {
      throw new AppError('Unable to fetch ride passengers', 500);
    }

    return {
      trip: {
        id: trip.id,
        tripId: trip.trip_id,
        driverTripId: assignment.driver_trip_id,
        rideInstanceId: trip.ride_instance_id,
        rideId: trip.ride_id,
        rideDate: trip.ride_date,
        departureTime: trip.departure_time,
        timeSlot: trip.time_slot,
        status: trip.status,
        vehiclePlate: trip.vehicle?.registration_number ?? 'Unknown vehicle',
        capacity: trip.capacity,
        route: {
          name: trip.route.name,
          fromName: trip.route.from_name,
          toName: trip.route.to_name,
          fromLat: trip.route.from_latitude,
          fromLng: trip.route.from_longitude,
          toLat: trip.route.to_latitude,
          toLng: trip.route.to_longitude,
        },
      },
      passengers: (bookings ?? []).map((booking) => ({
        bookingId: booking.id,
        userId: booking.rider_id,
        userName: `${booking.rider?.first_name ?? ''} ${booking.rider?.last_name ?? ''}`.trim(),
        pickupPointId: booking.pickup_point?.id ?? null,
        pickupPointName: booking.pickup_point?.name ?? null,
        bookingStatus: booking.status,
      })),
    };
  }

  /** Fetch active vehicle assignments for a batch of drivers. */
  async getActiveVehicleAssignmentsByDriverIds(
    driverIds: string[]
  ): Promise<
    Record<string, { assignmentId: string; vehicleId: string; registrationNumber: string; assignedAt: string }>
  > {
    if (driverIds.length === 0) return {};

    const { data, error } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .select('id, driver_id, vehicle_id, assigned_at, vehicle:vehicles(id, registration_number)')
      .in('driver_id', driverIds)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false })
      .returns<DriverVehicleAssignmentProjection[]>();

    if (error) {
      throw new AppError('Unable to fetch active driver vehicle assignments', 500);
    }

    const assignments: Record<
      string,
      { assignmentId: string; vehicleId: string; registrationNumber: string; assignedAt: string }
    > = {};
    for (const row of data ?? []) {
      if (assignments[row.driver_id]) continue;
      if (!row.vehicle) continue;
      assignments[row.driver_id] = {
        assignmentId: row.id,
        vehicleId: row.vehicle_id,
        registrationNumber: row.vehicle.registration_number,
        assignedAt: row.assigned_at,
      };
    }

    return assignments;
  }
}

export const driversRepository = new DriversRepository();
