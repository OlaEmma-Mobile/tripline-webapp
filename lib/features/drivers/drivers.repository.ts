import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type {
  CreateDriverInput,
  DriverFilters,
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
      .from('ride_instances')
      .select(
        'id, departure_time, route:routes(name), vehicle:vehicles(registration_number), bookings(id, rider_id, status, rider:users!bookings_rider_id_fkey(first_name, last_name))'
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
