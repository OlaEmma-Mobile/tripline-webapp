import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type {
  PickupPointCreateInput,
  PickupPointRecord,
  PickupPointReorderItemInput,
  PickupPointUpdateInput,
} from './pickup-points.types';

export class PickupPointsRepository {
  /**
   * listByRoute Executes a core module operation used by API workflows.
   */
  async listByRoute(routeId: string): Promise<PickupPointRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('pickup_points')
      .select('*')
      .eq('route_id', routeId)
      .order('order_index', { ascending: true })
      .returns<PickupPointRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch pickup points', 500);
    }

    return data ?? [];
  }

  /**
   * getById Executes a core module operation used by API workflows.
   */
  async getById(routeId: string, pickupPointId: string): Promise<PickupPointRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('pickup_points')
      .select('*')
      .eq('route_id', routeId)
      .eq('id', pickupPointId)
      .maybeSingle<PickupPointRecord>();

    if (error) {
      throw new AppError('Unable to fetch pickup point', 500);
    }

    return data ?? null;
  }

  /**
   * create Executes a core module operation used by API workflows.
   */
  async create(input: PickupPointCreateInput): Promise<PickupPointRecord> {
    const { data, error } = await supabaseAdmin
      .from('pickup_points')
      .insert({
        route_id: input.routeId,
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        order_index: input.orderIndex,
        token_cost: input.tokenCost,
      })
      .select('*')
      .single<PickupPointRecord>();

    if (error?.code === '23505') {
      throw new AppError('Pickup point order or name already exists on this route', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to create pickup point', 500);
    }

    return data;
  }

  /**
   * update Executes a core module operation used by API workflows.
   */
  async update(routeId: string, pickupPointId: string, input: PickupPointUpdateInput): Promise<PickupPointRecord> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.name !== undefined) updates.name = input.name;
    if (input.latitude !== undefined) updates.latitude = input.latitude;
    if (input.longitude !== undefined) updates.longitude = input.longitude;
    if (input.orderIndex !== undefined) updates.order_index = input.orderIndex;
    if (input.tokenCost !== undefined) updates.token_cost = input.tokenCost;

    const { data, error } = await supabaseAdmin
      .from('pickup_points')
      .update(updates)
      .eq('route_id', routeId)
      .eq('id', pickupPointId)
      .select('*')
      .single<PickupPointRecord>();

    if (error?.code === '23505') {
      throw new AppError('Pickup point order or name already exists on this route', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to update pickup point', 500);
    }

    return data;
  }

  /**
   * delete Executes a core module operation used by API workflows.
   */
  async delete(routeId: string, pickupPointId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('pickup_points').delete().eq('route_id', routeId).eq('id', pickupPointId);

    if (error) {
      throw new AppError('Unable to delete pickup point', 500);
    }
  }

  /**
   * reorder Updates pickup point sequence for one route via transactional RPC.
   */
  async reorder(routeId: string, items: PickupPointReorderItemInput[]): Promise<void> {
    const { error } = await supabaseAdmin.rpc('reorder_pickup_points', {
      p_route_id: routeId,
      p_items: items.map((item) => ({ id: item.id, sequence: item.sequence })),
    });

    if (error) {
      throw new AppError('Unable to reorder pickup points', 500);
    }
  }
}

export const pickupPointsRepository = new PickupPointsRepository();
