import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import { logStep } from '@/lib/utils/logger';
import type {
  CreateRideInstanceInput,
  RideInstanceAvailabilityRecord,
  RideInstanceFilters,
  RideInstanceRecord,
  RideInstanceDetailRecord,
  UpdateRideInstanceInput,
} from './ride-instances.types';

/**
 * toInsert Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function toInsert(input: CreateRideInstanceInput): Record<string, unknown> {
  return {
    route_id: input.routeId,
    ride_date: input.rideDate,
    time_slot: input.timeSlot,
    status: input.status ?? 'scheduled',
  };
}

/**
 * toUpdate Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function toUpdate(input: UpdateRideInstanceInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.routeId !== undefined) out.route_id = input.routeId;
  if (input.vehicleId !== undefined) out.vehicle_id = input.vehicleId;
  if (input.rideDate !== undefined) out.ride_date = input.rideDate;
  if (input.timeSlot !== undefined) out.time_slot = input.timeSlot;
  if (input.status !== undefined) out.status = input.status;
  return out;
}

interface RouteStatusRecord {
  id: string;
  status: 'available' | 'coming_soon' | 'active' | 'inactive';
}

interface VehicleStatusRecord {
  id: string;
  status: 'active' | 'inactive' | 'maintenance';
}

interface DriverStatusRecord {
  id: string;
  role: 'driver' | 'rider' | 'admin' | 'sub_admin';
  status: 'active' | 'inactive' | 'restricted';
}

interface DriverVehicleAssignmentRecord {
  driver_id: string;
  vehicle_id: string;
}

interface RouteNameRecord {
  id: string;
  name: string;
}

interface VehiclePlateRecord {
  id: string;
  registration_number: string;
}

interface DriverNameRecord {
  id: string;
  first_name: string;
  last_name: string;
}

interface RideDriverAssignmentLookup {
  ride_instance_id: string;
  driver_id: string;
  driver_trip_id?: string;
  assigned_at?: string;
}

/**
 * Ride instance persistence.
 */
export class RideInstancesRepository {
  /**
   * Detects whether the ride_instances table is still using the old non-null vehicle contract.
   */
  private isVehicleConstraintMismatch(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const message = (error.message ?? '').toLowerCase();
    return (
      error.code === '23502' &&
      (message.includes('vehicle_id') || message.includes('ride_instances_vehicle_id'))
    );
  }

  /**
   * Detects when the availability view or related DB objects are out of date.
   */
  private isRideSchemaMismatch(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const message = (error.message ?? '').toLowerCase();
    return (
      error.code === '42P01' ||
      error.code === '42703' ||
      message.includes('ride_instance_availability') ||
      message.includes('vehicle_id') ||
      message.includes('ride_id') ||
      message.includes('time_slot')
    );
  }

  /**
   * Detects whether the ride-driver assignment table is missing in the current DB state.
   */
  private isMissingRideDriverAssignmentsTable(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const message = (error.message ?? '').toLowerCase();
    return error.code === '42P01' || message.includes('ride_instance_driver_assignments');
  }

  /**
   * Create a single ride instance row.
   * @param input Validated create payload.
   * @returns Newly created ride instance row.
   */
  async create(input: CreateRideInstanceInput): Promise<RideInstanceRecord> {
    const { data, error } = await supabaseAdmin
      .from('ride_instances')
      .insert(toInsert(input))
      .select('*')
      .single<RideInstanceRecord>();

    if (error?.code === '23505') {
      throw new AppError('Ride instance already exists for this departure', 409);
    }
    if (this.isVehicleConstraintMismatch(error)) {
      logStep('ride create failed: vehicle_id constraint mismatch', {
        code: error?.code ?? 'unknown',
        message: error?.message ?? 'no message',
      });
      throw new AppError('Ride schema not migrated: vehicle-free ride creation is not enabled', 500);
    }
    if (this.isRideSchemaMismatch(error)) {
      logStep('ride create failed: schema mismatch', {
        code: error?.code ?? 'unknown',
        message: error?.message ?? 'no message',
      });
      throw new AppError('Ride schema not migrated: database objects are out of date', 500);
    }
    if (error || !data) {
      logStep('ride create failed', {
        code: error?.code ?? 'unknown',
        message: error?.message ?? 'no message',
        routeId: input.routeId,
        rideDate: input.rideDate,
        timeSlot: input.timeSlot,
      });
      throw new AppError('Unable to create ride instance', 500);
    }
    return data;
  }

  /**
   * Create multiple ride instances for one date.
   * @param inputs Batch create payloads.
   * @returns Created ride instance rows.
   */
  async createBulk(inputs: CreateRideInstanceInput[]): Promise<RideInstanceRecord[]> {
    if (inputs.length === 0) return [];
    const rows = inputs.map(toInsert);
    const { data, error } = await supabaseAdmin
      .from('ride_instances')
      .insert(rows)
      .select('*')
      .returns<RideInstanceRecord[]>();

    if (error) {
      logStep('bulk ride instance insert failed', {
        code: error.code ?? 'unknown',
        message: error.message ?? 'no message',
      });
      if (error.code === '23505') {
        throw new AppError('Duplicate ride departure exists for this date/time', 409);
      }
      if (error.code === '23503') {
        throw new AppError('Invalid related entity reference', 400);
      }
      if (error.code === '42P01') {
        throw new AppError('Ride schema not migrated: ride_instances table not found', 500);
      }
      throw new AppError(
        `Unable to create ride instances: ${error.message ?? 'unknown database error'}`,
        500
      );
    }
    return data ?? [];
  }

  /**
   * Find a ride instance by id.
   * @param id Ride instance id.
   * @returns Ride instance row when found, otherwise null.
   */
  async getById(id: string): Promise<RideInstanceRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('ride_instances')
      .select('*')
      .eq('id', id)
      .maybeSingle<RideInstanceRecord>();

    if (error) {
      throw new AppError('Unable to fetch ride instance', 500);
    }
    return data ?? null;
  }

  /**
   * Update a ride instance row.
   * @param id Ride instance id.
   * @param input Patch payload.
   * @returns Updated ride instance row.
   */
  async update(id: string, input: UpdateRideInstanceInput): Promise<RideInstanceRecord> {
    const { data, error } = await supabaseAdmin
      .from('ride_instances')
      .update(toUpdate(input))
      .eq('id', id)
      .select('*')
      .single<RideInstanceRecord>();

    if (error?.code === '23505') {
      throw new AppError('Ride instance already exists for this departure', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to update ride instance', 500);
    }
    return data;
  }

  /**
   * Soft-cancel ride instance.
   * @param id Ride instance id.
   * @returns Updated row with cancelled status.
   */
  async cancel(id: string): Promise<RideInstanceRecord> {
    const { data, error } = await supabaseAdmin
      .from('ride_instances')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select('*')
      .single<RideInstanceRecord>();

    if (error || !data) {
      throw new AppError('Unable to cancel ride instance', 500);
    }
    return data;
  }

  /**
   * Permanently deletes a ride instance.
   * @param id Ride instance id.
   */
  async hardDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('ride_instances').delete().eq('id', id);
    if (error) {
      throw new AppError('Unable to delete ride instance', 500);
    }
  }

  /**
   * List ride instances joined with availability view.
   * @param filters Pagination and query filters.
   * @returns Paginated availability rows.
   */
  async listAvailability(
    filters: RideInstanceFilters
  ): Promise<{ items: RideInstanceAvailabilityRecord[]; total: number }> {
    let query = supabaseAdmin
      .from('ride_instance_availability')
      .select('*', { count: 'exact' });

    if (filters.routeId) query = query.eq('route_id', filters.routeId);
    if (filters.rideDate) query = query.eq('ride_date', filters.rideDate);
    if (filters.timeSlot) query = query.eq('time_slot', filters.timeSlot);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    }

    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;

    const { data, error, count } = await query
      .order('ride_date', { ascending: false })
      .order('departure_time', { ascending: false })
      .range(from, to)
      .returns<RideInstanceAvailabilityRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch ride instances', 500);
    }

    return { items: data ?? [], total: count ?? 0 };
  }

  /**
   * List ride instance planning rows without relying on availability projections.
   */
  async listRecords(
    filters: RideInstanceFilters
  ): Promise<{ items: RideInstanceRecord[]; total: number }> {
    let query = supabaseAdmin.from('ride_instances').select('*', { count: 'exact' });

    if (filters.routeId) query = query.eq('route_id', filters.routeId);
    if (filters.rideDate) query = query.eq('ride_date', filters.rideDate);
    if (filters.timeSlot) query = query.eq('time_slot', filters.timeSlot);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    }

    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;

    const { data, error, count } = await query
      .order('ride_date', { ascending: false })
      .order('departure_time', { ascending: false })
      .range(from, to)
      .returns<RideInstanceRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch ride instances', 500);
    }

    return { items: data ?? [], total: count ?? 0 };
  }

  /**
   * Fetch one availability row by ride instance id.
   * @param id Ride instance id.
   * @returns Availability row or null.
   */
  async getAvailabilityByRideInstanceId(id: string): Promise<RideInstanceAvailabilityRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('ride_instance_availability')
      .select('*')
      .eq('ride_instance_id', id)
      .maybeSingle<RideInstanceAvailabilityRecord>();

    if (this.isRideSchemaMismatch(error)) {
      throw new AppError('Ride schema not migrated: availability view is out of date', 500);
    }
    if (error) {
      throw new AppError('Unable to fetch ride instance availability', 500);
    }
    return data ?? null;
  }

  /**
   * Fetch ride instance with route/driver/vehicle details.
   */
  async getDetailsById(id: string): Promise<RideInstanceDetailRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('ride_instances')
      .select(
        'id, ride_id, route_id, vehicle_id, ride_date, departure_time, time_slot, status, route:routes(id, name, from_name, to_name, from_latitude, from_longitude, to_latitude, to_longitude), vehicle:vehicles(id, registration_number, model, capacity)'
      )
      .eq('id', id)
      .maybeSingle<
        Omit<RideInstanceDetailRecord, 'drivers'> & {
          vehicle: RideInstanceDetailRecord['vehicle'];
          route: RideInstanceDetailRecord['route'];
        }
      >();

    if (error) {
      throw new AppError('Unable to fetch ride instance details', 500);
    }
    if (!data) return null;
    const drivers = await this.getAssignedDriversByRideInstanceId(id);
    return {
      ...data,
      drivers,
    };
  }

  /**
   * Fetch route status.
   * @param routeId Route id.
   * @returns Route status row or null.
   */
  async getRoute(routeId: string): Promise<RouteStatusRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('id, status')
      .eq('id', routeId)
      .maybeSingle<RouteStatusRecord>();

    if (error) {
      throw new AppError('Unable to fetch route', 500);
    }
    return data ?? null;
  }

  /**
   * Fetch vehicle status.
   * @param vehicleId Vehicle id.
   * @returns Vehicle status row or null.
   */
  async getVehicle(vehicleId: string): Promise<VehicleStatusRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('id, status')
      .eq('id', vehicleId)
      .maybeSingle<VehicleStatusRecord>();

    if (error) {
      throw new AppError('Unable to fetch vehicle', 500);
    }
    return data ?? null;
  }

  /**
   * Updates the canonical ride vehicle used for availability/capacity calculations.
   */
  async setRideVehicle(rideInstanceId: string, vehicleId: string | null): Promise<void> {
    const { error } = await supabaseAdmin
      .from('ride_instances')
      .update({ vehicle_id: vehicleId })
      .eq('id', rideInstanceId);

    if (error) {
      throw new AppError('Unable to sync ride vehicle', 500);
    }
  }

  /**
   * Fetch driver status and role.
   * @param driverId Driver user id.
   * @returns Driver status/role row or null.
   */
  async getDriver(driverId: string): Promise<DriverStatusRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, role, status')
      .eq('id', driverId)
      .maybeSingle<DriverStatusRecord>();

    if (error) {
      throw new AppError('Unable to fetch driver', 500);
    }
    return data ?? null;
  }

  /**
   * Fetch active vehicle assignment for a driver.
   * @param driverId Driver user id.
   * @returns Active assignment row or null when none exists.
   */
  async getActiveVehicleAssignmentForDriver(
    driverId: string
  ): Promise<DriverVehicleAssignmentRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .select('driver_id, vehicle_id')
      .eq('driver_id', driverId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false })
      .maybeSingle<DriverVehicleAssignmentRecord>();

    if (error) {
      throw new AppError('Unable to fetch driver vehicle assignment', 500);
    }

    return data ?? null;
  }

  /**
   * Fetch route names for a list of route ids.
   */
  async getRouteNames(routeIds: string[]): Promise<Record<string, string>> {
    if (routeIds.length === 0) return {};
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('id, name')
      .in('id', routeIds)
      .returns<RouteNameRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch route names', 500);
    }

    const out: Record<string, string> = {};
    for (const row of data ?? []) out[row.id] = row.name;
    return out;
  }

  /**
   * Fetch vehicle plates for a list of vehicle ids.
   */
  async getVehiclePlates(vehicleIds: string[]): Promise<Record<string, string>> {
    const filteredIds = vehicleIds.filter(Boolean) as string[];
    if (filteredIds.length === 0) return {};
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('id, registration_number')
      .in('id', filteredIds)
      .returns<VehiclePlateRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch vehicle plates', 500);
    }

    const out: Record<string, string> = {};
    for (const row of data ?? []) out[row.id] = row.registration_number;
    return out;
  }

  /**
   * Fetch driver names for a list of user ids.
   */
  async getDriverNames(driverIds: string[]): Promise<Record<string, string>> {
    if (driverIds.length === 0) return {};
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name')
      .in('id', driverIds)
      .returns<DriverNameRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch driver names', 500);
    }

    const out: Record<string, string> = {};
    for (const row of data ?? []) out[row.id] = `${row.first_name} ${row.last_name}`.trim();
    return out;
  }

  /**
   * Fetch active assigned drivers grouped by ride instance id.
   */
  async getAssignedDriverNamesByRideInstanceIds(
    rideInstanceIds: string[]
  ): Promise<Record<string, string[]>> {
    if (rideInstanceIds.length === 0) return {};

    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('ride_instance_driver_assignments')
      .select('ride_instance_id, driver_id')
      .in('ride_instance_id', rideInstanceIds)
      .eq('status', 'active')
      .returns<RideDriverAssignmentLookup[]>();

    if (this.isMissingRideDriverAssignmentsTable(assignmentsError)) {
      throw new AppError('Ride driver assignment schema not migrated', 500);
    }
    if (assignmentsError) {
      throw new AppError('Unable to fetch ride driver assignments', 500);
    }

    const driverIds = Array.from(new Set((assignments ?? []).map((row) => row.driver_id).filter(Boolean)));
    if (driverIds.length === 0) return {};

    const { data: drivers, error: driversError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name')
      .in('id', driverIds)
      .returns<DriverNameRecord[]>();

    if (driversError) {
      throw new AppError('Unable to fetch drivers for ride assignments', 500);
    }

    const driverNamesById = new Map<string, string>();
    for (const driver of drivers ?? []) {
      const name = `${driver.first_name ?? ''} ${driver.last_name ?? ''}`.trim();
      driverNamesById.set(driver.id, name);
    }

    const out: Record<string, string[]> = {};
    for (const row of assignments ?? []) {
      if (!out[row.ride_instance_id]) out[row.ride_instance_id] = [];
      const name = driverNamesById.get(row.driver_id) ?? '';
      if (name) out[row.ride_instance_id].push(name);
    }
    return out;
  }

  /**
   * Fetch active assigned drivers for a ride instance.
   */
  async getAssignedDriversByRideInstanceId(
    rideInstanceId: string
  ): Promise<RideInstanceDetailRecord['drivers']> {
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('ride_instance_driver_assignments')
.select('driver_id, driver_trip_id, assigned_at')
      .eq('ride_instance_id', rideInstanceId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: true })
      .returns<RideDriverAssignmentLookup[]>();

    if (this.isMissingRideDriverAssignmentsTable(assignmentsError)) {
      throw new AppError('Ride driver assignment schema not migrated', 500);
    }
    if (assignmentsError) {
      throw new AppError('Unable to fetch assigned driver assignments', 500);
    }

    const driverIds = (assignments ?? []).map((row) => row.driver_id).filter(Boolean);
    if (driverIds.length === 0) return [];

    const { data: drivers, error: driversError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, phone, email')
      .in('id', driverIds)
      .returns<
        Array<{
          id: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          email: string;
        }>
      >();

    if (driversError) {
      throw new AppError('Unable to fetch drivers for ride assignments', 500);
    }

    const driversById = new Map<
      string,
      {
        id: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        email: string;
      }
    >();
    for (const driver of drivers ?? []) {
      driversById.set(driver.id, driver);
    }

    const { data: vehicleAssignments, error: vehicleAssignmentError } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .select('driver_id, vehicle_id, assigned_at, vehicle:vehicles(id, registration_number, model, capacity)')
      .in('driver_id', driverIds)
      .eq('status', 'active')
      .returns<
        Array<{
          driver_id: string;
          vehicle_id: string;
          assigned_at: string;
          vehicle: {
            id: string;
            registration_number: string;
            model: string | null;
            capacity: number;
          } | null;
        }>
      >();

    if (vehicleAssignmentError) {
      throw new AppError('Unable to fetch driver vehicles', 500);
    }

    const vehicleAssignmentsByDriverId = new Map<
      string,
      {
        vehicle_id: string;
        assigned_at: string;
        vehicle: {
          id: string;
          registration_number: string;
          model: string | null;
          capacity: number;
        } | null;
      }
    >();

    for (const row of vehicleAssignments ?? []) {
      if (!vehicleAssignmentsByDriverId.has(row.driver_id)) {
        vehicleAssignmentsByDriverId.set(row.driver_id, row);
      }
    }

    return (assignments ?? [])
      .map((row) => {
        const driver = driversById.get(row.driver_id);
        if (!driver) return null;
        const assignment = vehicleAssignmentsByDriverId.get(row.driver_id);
        return {
          ...driver,
          driver_trip_id: row.driver_trip_id,
          assigned_vehicle: assignment?.vehicle
            ? {
                vehicle_id: assignment.vehicle_id,
                registration_number: assignment.vehicle.registration_number,
                model: assignment.vehicle.model,
                capacity: assignment.vehicle.capacity,
                assigned_at: assignment.assigned_at,
              }
            : null,
        };
      })
      .filter(
        (
          driver
        ): driver is RideInstanceDetailRecord['drivers'][number] => Boolean(driver)
      );
  }

  /**
   * Fetch pickup point counts keyed by route id.
   */
  async getPickupPointCounts(routeIds: string[]): Promise<Record<string, number>> {
    if (routeIds.length === 0) return {};
    const { data, error } = await supabaseAdmin
      .from('pickup_points')
      .select('route_id')
      .in('route_id', routeIds)
      .returns<Array<{ route_id: string }>>();

    if (error) {
      throw new AppError('Unable to fetch pickup point counts', 500);
    }

    const out: Record<string, number> = {};
    for (const routeId of routeIds) out[routeId] = 0;
    for (const row of data ?? []) {
      out[row.route_id] = (out[row.route_id] ?? 0) + 1;
    }
    return out;
  }
}

export const rideInstancesRepository = new RideInstancesRepository();
