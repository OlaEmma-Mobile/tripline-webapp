import { AppError } from '@/lib/utils/errors';
import { routesRepository } from '@/lib/features/routes/routes.repository';
import { pickupPointsRepository, PickupPointsRepository } from './pickup-points.repository';
import type {
  PickupPointCreateInput,
  PickupPointDTO,
  PickupPointRecord,
  PickupPointReorderItemInput,
  PickupPointUpdateInput,
} from './pickup-points.types';

/**
 * mapPickup Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapPickup(record: PickupPointRecord): PickupPointDTO {
  return {
    id: record.id,
    routeId: record.route_id,
    name: record.name,
    latitude: record.latitude,
    longitude: record.longitude,
    orderIndex: record.order_index,
    sequence: record.order_index,
    tokenCost: record.token_cost,
    tokenModifier: record.token_cost,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export class PickupPointsService {
  constructor(private readonly repo: PickupPointsRepository) {}

  /**
   * listPickupPoints Executes a core module operation used by API workflows.
   */
  async listPickupPoints(routeId: string): Promise<PickupPointDTO[]> {
    const route = await routesRepository.getRouteById(routeId);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    const points = await this.repo.listByRoute(routeId);
    return points.map(mapPickup);
  }

  /**
   * createPickupPoint Executes a core module operation used by API workflows.
   */
  async createPickupPoint(input: PickupPointCreateInput): Promise<PickupPointDTO> {
    const route = await routesRepository.getRouteById(input.routeId);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    const created = await this.repo.create(input);
    return mapPickup(created);
  }

  /**
   * updatePickupPoint Executes a core module operation used by API workflows.
   */
  async updatePickupPoint(routeId: string, pickupPointId: string, input: PickupPointUpdateInput): Promise<PickupPointDTO> {
    const route = await routesRepository.getRouteById(routeId);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    const existing = await this.repo.getById(routeId, pickupPointId);
    if (!existing) {
      throw new AppError('Pickup point not found', 404);
    }

    const updated = await this.repo.update(routeId, pickupPointId, input);
    return mapPickup(updated);
  }

  /**
   * deletePickupPoint Executes a core module operation used by API workflows.
   */
  async deletePickupPoint(routeId: string, pickupPointId: string): Promise<void> {
    const route = await routesRepository.getRouteById(routeId);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    const existing = await this.repo.getById(routeId, pickupPointId);
    if (!existing) {
      throw new AppError('Pickup point not found', 404);
    }

    await this.repo.delete(routeId, pickupPointId);
  }

  /**
   * reorderPickupPoints Validates route ownership and updates pickup point sequence.
   */
  async reorderPickupPoints(routeId: string, items: PickupPointReorderItemInput[]): Promise<PickupPointDTO[]> {
    const route = await routesRepository.getRouteById(routeId);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    const existing = await this.repo.listByRoute(routeId);
    const existingIds = new Set(existing.map((point) => point.id));
    for (const item of items) {
      if (!existingIds.has(item.id)) {
        throw new AppError('One or more pickup points do not belong to this route', 400);
      }
    }

    await this.repo.reorder(routeId, items);
    const reordered = await this.repo.listByRoute(routeId);
    return reordered.map(mapPickup);
  }
}

export const pickupPointsService = new PickupPointsService(pickupPointsRepository);
