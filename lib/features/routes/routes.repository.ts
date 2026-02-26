import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type { PickupPointRecord } from '@/lib/features/pickup-points/pickup-points.types';
import type { RouteCreateInput, RouteFilters, RouteRecord, RouteUpdateInput } from './routes.types';

/**
 * toRouteInsert Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function toRouteInsert(input: RouteCreateInput): Record<string, unknown> {
  return {
    name: input.name,
    company_id: input.companyId ?? null,
    from_name: input.fromName,
    from_latitude: input.fromLatitude,
    from_longitude: input.fromLongitude,
    to_name: input.toName,
    to_latitude: input.toLatitude,
    to_longitude: input.toLongitude,
    base_token_cost: input.baseTokenCost,
    status: input.status ?? 'active',
  };
}

/**
 * toRouteUpdate Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function toRouteUpdate(input: RouteUpdateInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.companyId !== undefined) out.company_id = input.companyId;
  if (input.fromName !== undefined) out.from_name = input.fromName;
  if (input.fromLatitude !== undefined) out.from_latitude = input.fromLatitude;
  if (input.fromLongitude !== undefined) out.from_longitude = input.fromLongitude;
  if (input.toName !== undefined) out.to_name = input.toName;
  if (input.toLatitude !== undefined) out.to_latitude = input.toLatitude;
  if (input.toLongitude !== undefined) out.to_longitude = input.toLongitude;
  if (input.baseTokenCost !== undefined) out.base_token_cost = input.baseTokenCost;
  if (input.status !== undefined) out.status = input.status;
  out.updated_at = new Date().toISOString();
  return out;
}

export class RoutesRepository {
  /**
   * createRoute Executes a core module operation used by API workflows.
   */
  async createRoute(input: RouteCreateInput): Promise<RouteRecord> {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .insert(toRouteInsert(input))
      .select('*')
      .single<RouteRecord>();

    if (error?.code === '23505') {
      throw new AppError('Route with this name already exists for this company', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to create route', 500);
    }
    return data;
  }

  /**
   * listRoutes Executes a core module operation used by API workflows.
   */
  async listRoutes(filters: RouteFilters): Promise<{ items: RouteRecord[]; total: number }> {
    let query = supabaseAdmin.from('routes').select('*', { count: 'exact' });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.companyId) query = query.eq('company_id', filters.companyId);

    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;

    const { data, error, count } = await query.order('updated_at', { ascending: false }).range(from, to);

    if (error) {
      throw new AppError('Unable to fetch routes', 500);
    }

    return { items: (data as RouteRecord[]) ?? [], total: count ?? 0 };
  }

  /**
   * getRouteById Executes a core module operation used by API workflows.
   */
  async getRouteById(routeId: string): Promise<RouteRecord | null> {
    const { data, error } = await supabaseAdmin.from('routes').select('*').eq('id', routeId).maybeSingle<RouteRecord>();

    if (error) {
      throw new AppError('Unable to fetch route', 500);
    }

    return data ?? null;
  }

  /**
   * updateRoute Executes a core module operation used by API workflows.
   */
  async updateRoute(routeId: string, input: RouteUpdateInput): Promise<RouteRecord> {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .update(toRouteUpdate(input))
      .eq('id', routeId)
      .select('*')
      .single<RouteRecord>();

    if (error?.code === '23505') {
      throw new AppError('Route with this name already exists for this company', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to update route', 500);
    }

    return data;
  }

  /**
   * deleteRoute Executes a core module operation used by API workflows.
   */
  async deleteRoute(routeId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('routes')
      .delete()
      .eq('id', routeId)
      .select('id')
      .single<{ id: string }>();

    if (error?.code === 'PGRST116') {
      throw new AppError('Route not found', 404);
    }
    if (error?.code === '23503') {
      throw new AppError('Route cannot be deleted because it is referenced by other records', 409);
    }
    if (error) {
      throw new AppError('Unable to delete route', 500);
    }
  }

  /**
   * getPickupCounts Executes a core module operation used by API workflows.
   */
  async getPickupCounts(routeIds: string[]): Promise<Record<string, number>> {
    if (routeIds.length === 0) return {};

    const { data, error } = await supabaseAdmin
      .from('pickup_points')
      .select('route_id')
      .in('route_id', routeIds)
      .returns<Pick<PickupPointRecord, 'route_id'>[]>();

    if (error) {
      throw new AppError('Unable to fetch pickup point counts', 500);
    }

    const counts: Record<string, number> = {};
    for (const id of routeIds) counts[id] = 0;
    for (const row of data ?? []) {
      counts[row.route_id] = (counts[row.route_id] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * searchRouteIdsByRouteFields Executes a core module operation used by API workflows.
   */
  async searchRouteIdsByRouteFields(
    q: string,
    options: { status?: string; companyId?: string; limit: number }
  ): Promise<string[]> {
    let query = supabaseAdmin
      .from('routes')
      .select('id')
      .or(`name.ilike.%${q}%,from_name.ilike.%${q}%,to_name.ilike.%${q}%`)
      .limit(options.limit);

    if (options.status) query = query.eq('status', options.status);
    if (options.companyId) query = query.eq('company_id', options.companyId);

    const { data, error } = await query.returns<Pick<RouteRecord, 'id'>[]>();

    if (error) {
      throw new AppError('Unable to search routes', 500);
    }

    return (data ?? []).map((row) => row.id);
  }

  /**
   * searchRouteIdsByPickupPointName Executes a core module operation used by API workflows.
   */
  async searchRouteIdsByPickupPointName(q: string, limit: number): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('pickup_points')
      .select('route_id')
      .ilike('name', `%${q}%`)
      .limit(limit)
      .returns<Pick<PickupPointRecord, 'route_id'>[]>();

    if (error) {
      throw new AppError('Unable to search pickup points', 500);
    }

    return [...new Set((data ?? []).map((row) => row.route_id))];
  }

  /**
   * getRoutesByIds Executes a core module operation used by API workflows.
   */
  async getRoutesByIds(routeIds: string[]): Promise<RouteRecord[]> {
    if (routeIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('*')
      .in('id', routeIds)
      .order('updated_at', { ascending: false })
      .returns<RouteRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch search routes', 500);
    }

    return data ?? [];
  }
}

export const routesRepository = new RoutesRepository();
