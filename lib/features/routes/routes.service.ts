import { AppError } from '@/lib/utils/errors';
import { pickupPointsRepository } from '@/lib/features/pickup-points/pickup-points.repository';
import type { PickupPointDTO, PickupPointRecord } from '@/lib/features/pickup-points/pickup-points.types';
import { routesRepository, RoutesRepository } from './routes.repository';
import type { RouteCreateInput, RouteDTO, RouteFilters, RouteRecord, RouteUpdateInput } from './routes.types';

/**
 * mapRoute Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapRoute(record: RouteRecord): RouteDTO {
  return {
    id: record.id,
    name: record.name,
    companyId: record.company_id,
    fromName: record.from_name,
    fromLatitude: record.from_latitude,
    fromLongitude: record.from_longitude,
    toName: record.to_name,
    toLatitude: record.to_latitude,
    toLongitude: record.to_longitude,
    baseTokenCost: record.base_token_cost,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

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

export class RoutesService {
  constructor(private readonly repo: RoutesRepository) {}

  /**
   * listRoutes Executes a core module operation used by API workflows.
   */
  async listRoutes(filters: RouteFilters): Promise<{ items: RouteDTO[]; total: number }> {
    const { items, total } = await this.repo.listRoutes(filters);
    const counts = await this.repo.getPickupCounts(items.map((route) => route.id));

    return {
      items: items.map((route) => ({ ...mapRoute(route), pickupPointsCount: counts[route.id] ?? 0 })),
      total,
    };
  }

  /**
   * createRoute Executes a core module operation used by API workflows.
   */
  async createRoute(input: RouteCreateInput): Promise<RouteDTO> {
    const created = await this.repo.createRoute(input);
    return mapRoute(created);
  }

  /**
   * getRoute Executes a core module operation used by API workflows.
   */
  async getRoute(routeId: string): Promise<RouteDTO & { pickupPoints: PickupPointDTO[] }> {
    const route = await this.repo.getRouteById(routeId);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    const pickupPoints = await pickupPointsRepository.listByRoute(routeId);
    return {
      ...mapRoute(route),
      pickupPoints: pickupPoints.map(mapPickup),
    };
  }

  /**
   * updateRoute Executes a core module operation used by API workflows.
   */
  async updateRoute(routeId: string, input: RouteUpdateInput): Promise<RouteDTO> {
    const existing = await this.repo.getRouteById(routeId);
    if (!existing) {
      throw new AppError('Route not found', 404);
    }

    const updated = await this.repo.updateRoute(routeId, input);
    return mapRoute(updated);
  }

  /**
   * deleteRoute Executes a core module operation used by API workflows.
   */
  async deleteRoute(routeId: string): Promise<void> {
    const existing = await this.repo.getRouteById(routeId);
    if (!existing) {
      throw new AppError('Route not found', 404);
    }

    await this.repo.deleteRoute(routeId);
  }

  /**
   * searchRoutes Executes a core module operation used by API workflows.
   */
  async searchRoutes(params: {
    q: string;
    status?: 'active' | 'inactive';
    companyId?: string;
    limit: number;
  }): Promise<{ items: Array<RouteDTO & { matchedPickupPoints: PickupPointDTO[] }>; total: number }> {
    const routeMatches = await this.repo.searchRouteIdsByRouteFields(params.q, {
      status: params.status,
      companyId: params.companyId,
      limit: params.limit,
    });

    const pickupMatches = await this.repo.searchRouteIdsByPickupPointName(params.q, params.limit);

    let routeIds = [...new Set([...routeMatches, ...pickupMatches])].slice(0, params.limit);

    if (routeIds.length === 0) {
      return { items: [], total: 0 };
    }

    let routes = await this.repo.getRoutesByIds(routeIds);

    if (params.status) {
      routes = routes.filter((route) => route.status === params.status);
    }
    if (params.companyId) {
      routes = routes.filter((route) => route.company_id === params.companyId);
    }

    routeIds = routes.map((route) => route.id);
    const counts = await this.repo.getPickupCounts(routeIds);

    const pickupPointsByRoute = new Map<string, PickupPointDTO[]>();
    for (const routeId of routeIds) {
      const points = await pickupPointsRepository.listByRoute(routeId);
      const matched = points
        .filter((point) => point.name.toLowerCase().includes(params.q.toLowerCase()))
        .map(mapPickup);
      pickupPointsByRoute.set(routeId, matched);
    }

    const items = routes.map((route) => ({
      ...mapRoute(route),
      pickupPointsCount: counts[route.id] ?? 0,
      matchedPickupPoints: pickupPointsByRoute.get(route.id) ?? [],
    }));

    return { items, total: items.length };
  }
}

export const routesService = new RoutesService(routesRepository);
