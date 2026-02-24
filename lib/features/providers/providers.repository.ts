import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type {
  CreateProviderInput,
  ProviderFilters,
  ProviderRecord,
  UpdateProviderInput,
} from './providers.types';

/**
 * toInsert Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function toInsert(input: CreateProviderInput): Record<string, unknown> {
  return {
    name: input.name,
    contact_name: input.contactName ?? null,
    contact_email: input.contactEmail ?? null,
    contact_phone: input.contactPhone ?? null,
    status: input.status ?? 'active',
  };
}

/**
 * toUpdate Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function toUpdate(input: UpdateProviderInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.contactName !== undefined) out.contact_name = input.contactName;
  if (input.contactEmail !== undefined) out.contact_email = input.contactEmail;
  if (input.contactPhone !== undefined) out.contact_phone = input.contactPhone;
  if (input.status !== undefined) out.status = input.status;
  return out;
}

/**
 * Provider persistence layer.
 */
export class ProvidersRepository {
  /** Create a provider row. */
  async create(input: CreateProviderInput): Promise<ProviderRecord> {
    const { data, error } = await supabaseAdmin
      .from('vehicle_providers')
      .insert(toInsert(input))
      .select('*')
      .single<ProviderRecord>();

    if (error?.code === '23505') {
      throw new AppError('Provider name already exists', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to create provider', 500);
    }
    return data;
  }

  /** List providers with optional filters. */
  async list(filters: ProviderFilters): Promise<{ items: ProviderRecord[]; total: number }> {
    let query = supabaseAdmin.from('vehicle_providers').select('*', { count: 'exact' });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.q) query = query.ilike('name', `%${filters.q}%`);

    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;

    const { data, error, count } = await query.order('updated_at', { ascending: false }).range(from, to);

    if (error) {
      throw new AppError('Unable to fetch providers', 500);
    }

    return { items: (data as ProviderRecord[]) ?? [], total: count ?? 0 };
  }

  /** Find provider by id. */
  async getById(id: string): Promise<ProviderRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('vehicle_providers')
      .select('*')
      .eq('id', id)
      .maybeSingle<ProviderRecord>();

    if (error) {
      throw new AppError('Unable to fetch provider', 500);
    }

    return data ?? null;
  }

  /** Update provider by id. */
  async update(id: string, input: UpdateProviderInput): Promise<ProviderRecord> {
    const { data, error } = await supabaseAdmin
      .from('vehicle_providers')
      .update(toUpdate(input))
      .eq('id', id)
      .select('*')
      .single<ProviderRecord>();

    if (error?.code === '23505') {
      throw new AppError('Provider name already exists', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to update provider', 500);
    }

    return data;
  }

  /** Soft delete provider by setting inactive status. */
  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('vehicle_providers')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) {
      throw new AppError('Unable to delete provider', 500);
    }
  }
}

export const providersRepository = new ProvidersRepository();
