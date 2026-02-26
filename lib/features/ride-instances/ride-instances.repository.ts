import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import { logStep } from '@/lib/utils/logger';
import type {
  CreateRideInstanceInput,
  RideInstanceAvailabilityRecord,
  RideInstanceFilters,
  RideInstanceRecord,
  UpdateRideInstanceInput,
} from './ride-instances.types';

/**
 * toInsert Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function toInsert(input: CreateRideInstanceInput): Record<string, unknown> {
  return {
    route_id: input.routeId,
    vehicle_id: input.vehicleId,
    driver_id: input.driverId ?? null,
    ride_date: input.rideDate,
    departure_time: input.departureTime,
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
  if (input.driverId !== undefined) out.driver_id = input.driverId;
  if (input.rideDate !== undefined) out.ride_date = input.rideDate;
  if (input.departureTime !== undefined) out.departure_time = input.departureTime;
  if (input.status !== undefined) out.status = input.status;
  return out;
}

interface RouteStatusRecord {
  id: string;
  status: 'active' | 'inactive';
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

/**
 * Ride instance persistence.
 */
export class RideInstancesRepository {
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
    if (error || !data) {
      throw new AppError('Unable to create ride instance', 500);
    }
    return data;
  }

  /**
   * Create multiple ride instances for one date.
   * @param inputs Batch create payloads (one per departure time).
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

    if (error) {
      throw new AppError('Unable to fetch ride instance availability', 500);
    }
    return data ?? null;
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
    if (vehicleIds.length === 0) return {};
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('id, registration_number')
      .in('id', vehicleIds)
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
