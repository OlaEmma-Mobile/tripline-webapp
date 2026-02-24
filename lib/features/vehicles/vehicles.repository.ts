import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleFilters,
  VehicleRecord,
} from './vehicles.types';

/**
 * toInsert Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function toInsert(input: CreateVehicleInput): Record<string, unknown> {
  return {
    provider_id: input.providerId ?? null,
    registration_number: input.registrationNumber,
    model: input.model ?? null,
    capacity: input.capacity,
    status: input.status ?? 'active',
  };
}

/**
 * toUpdate Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function toUpdate(input: UpdateVehicleInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.providerId !== undefined) out.provider_id = input.providerId;
  if (input.registrationNumber !== undefined) out.registration_number = input.registrationNumber;
  if (input.model !== undefined) out.model = input.model;
  if (input.capacity !== undefined) out.capacity = input.capacity;
  if (input.status !== undefined) out.status = input.status;
  return out;
}

/**
 * Vehicle persistence layer.
 */
export class VehiclesRepository {
  /** Create vehicle row. */
  async create(input: CreateVehicleInput): Promise<VehicleRecord> {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .insert(toInsert(input))
      .select('*')
      .single<VehicleRecord>();

    if (error?.code === '23505') {
      throw new AppError('Registration number already exists', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to create vehicle', 500);
    }
    return data;
  }

  /** List vehicles with optional filters. */
  async list(filters: VehicleFilters): Promise<{ items: VehicleRecord[]; total: number }> {
    let query = supabaseAdmin.from('vehicles').select('*', { count: 'exact' });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.providerId) query = query.eq('provider_id', filters.providerId);
    if (filters.q) query = query.ilike('registration_number', `%${filters.q}%`);

    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;

    const { data, error, count } = await query.order('updated_at', { ascending: false }).range(from, to);

    if (error) {
      throw new AppError('Unable to fetch vehicles', 500);
    }

    return { items: (data as VehicleRecord[]) ?? [], total: count ?? 0 };
  }

  /** Fetch vehicle by id. */
  async getById(id: string): Promise<VehicleRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .maybeSingle<VehicleRecord>();

    if (error) {
      throw new AppError('Unable to fetch vehicle', 500);
    }

    return data ?? null;
  }

  /** Update vehicle. */
  async update(id: string, input: UpdateVehicleInput): Promise<VehicleRecord> {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .update(toUpdate(input))
      .eq('id', id)
      .select('*')
      .single<VehicleRecord>();

    if (error?.code === '23505') {
      throw new AppError('Registration number already exists', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to update vehicle', 500);
    }

    return data;
  }

  /** Soft delete vehicle. */
  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('vehicles').update({ status: 'inactive' }).eq('id', id);
    if (error) {
      throw new AppError('Unable to delete vehicle', 500);
    }
  }
}

export const vehiclesRepository = new VehiclesRepository();
