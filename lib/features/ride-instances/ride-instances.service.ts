import { AppError } from '@/lib/utils/errors';
import { logStep } from '@/lib/utils/logger';
import { realtimeService, RealtimeRideStatus } from '@/lib/features/realtime/realtime.service';
import { rideInstancesRepository, RideInstancesRepository } from './ride-instances.repository';
import type {
  CreateRideInstanceInput,
  CreateRideInstancesBulkInput,
  DriverLocationUpdateResult,
  RideInstanceAvailabilityRecord,
  RideInstanceDTO,
  RideInstanceFilters,
  UpdateRideInstanceInput,
} from './ride-instances.types';

/**
 * mapAvailability Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapAvailability(record: RideInstanceAvailabilityRecord): RideInstanceDTO {
  return {
    id: record.ride_instance_id,
    routeId: record.route_id,
    vehicleId: record.vehicle_id,
    driverId: record.driver_id,
    rideDate: record.ride_date,
    departureTime: record.departure_time,
    status: record.status,
    capacity: record.capacity,
    reservedSeats: record.reserved_seats,
    availableSeats: record.available_seats,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Ride instance business logic.
 */
export class RideInstancesService {
  constructor(private readonly repo: RideInstancesRepository) {}

  /**
   * Normalizes HH:MM values to HH:MM:SS for consistent storage and uniqueness checks.
   * @param value Time string in HH:MM or HH:MM:SS.
   * @returns Time string normalized to HH:MM:SS.
   */
  private normalizeDepartureTime(value: string): string {
    const parts = value.split(':');
    return parts.length === 2 ? `${parts[0]}:${parts[1]}:00` : value;
  }

  /**
   * Maps DB ride status to Firebase realtime status vocabulary.
   */
  private mapRealtimeStatus(status: RideInstanceAvailabilityRecord['status']): RealtimeRideStatus {
    return status === 'departed' ? 'on_trip' : status;
  }

  /**
   * Validates that referenced route/vehicle/driver exist and are active.
   * @param routeId Route id.
   * @param vehicleId Vehicle id.
   * @param driverId Optional driver id.
   */
  private async validateRouteVehicleDriver(
    routeId: string,
    vehicleId: string,
    driverId?: string | null
  ): Promise<void> {
    const route = await this.repo.getRoute(routeId);
    if (!route) throw new AppError('Route not found', 404);
    if (route.status !== 'active') throw new AppError('Route must be active for ride scheduling', 400);

    const vehicle = await this.repo.getVehicle(vehicleId);
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    if (vehicle.status !== 'active') throw new AppError('Vehicle must be active for ride scheduling', 400);

    if (driverId) {
      const driver = await this.repo.getDriver(driverId);
      if (!driver || driver.role !== 'driver') {
        throw new AppError('Driver not found', 404);
      }
      if (driver.status !== 'active') {
        throw new AppError('Driver must be active for ride scheduling', 400);
      }
    }
  }

  /**
   * Create one ride instance and return availability projection.
   * @param input Validated create payload.
   * @returns Created ride instance with computed availability.
   */
  async create(input: CreateRideInstanceInput): Promise<RideInstanceDTO> {
    const normalizedInput: CreateRideInstanceInput = {
      ...input,
      departureTime: this.normalizeDepartureTime(input.departureTime),
    };
    await this.validateRouteVehicleDriver(
      normalizedInput.routeId,
      normalizedInput.vehicleId,
      normalizedInput.driverId
    );
    const created = await this.repo.create(normalizedInput);
    const availability = await this.repo.getAvailabilityByRideInstanceId(created.id);
    if (!availability) {
      throw new AppError('Unable to fetch created ride availability', 500);
    }
    return mapAvailability(availability);
  }

  /**
   * Create multiple ride instances for one date and return availability rows.
   * @param input Validated bulk payload.
   * @returns Created ride instances with availability.
   */
  async createBulk(input: CreateRideInstancesBulkInput): Promise<RideInstanceDTO[]> {
    await this.validateRouteVehicleDriver(input.routeId, input.vehicleId, input.driverId);
    const rows = input.departureTimes.map((departureTime) => ({
      routeId: input.routeId,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      rideDate: input.rideDate,
      departureTime: this.normalizeDepartureTime(departureTime),
      status: input.status,
    }));

    const created = await this.repo.createBulk(rows);
    const results: RideInstanceDTO[] = [];
    for (const item of created) {
      const availability = await this.repo.getAvailabilityByRideInstanceId(item.id);
      if (availability) results.push(mapAvailability(availability));
    }
    return results;
  }

  /**
   * List ride instances with availability.
   * @param filters Pagination and query filters.
   * @returns Paginated ride availability data.
   */
  async list(filters: RideInstanceFilters): Promise<{ items: RideInstanceDTO[]; total: number }> {
    const { items, total } = await this.repo.listAvailability(filters);
    return { items: items.map(mapAvailability), total };
  }

  /**
   * Returns route-specific availability for a date, limited to bookable ride statuses.
   * @param routeId Route id.
   * @param rideDate Service date in YYYY-MM-DD format.
   * @returns Ride instances with computed availability for the route/date.
   */
  async getRouteAvailability(routeId: string, rideDate: string): Promise<RideInstanceDTO[]> {
    const route = await this.repo.getRoute(routeId);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    const { items } = await this.repo.listAvailability({
      page: 1,
      limit: 200,
      routeId,
      rideDate,
      statuses: ['scheduled', 'boarding'],
    });
    return items.map(mapAvailability);
  }

  /**
   * Update ride instance and return availability projection.
   * @param id Ride instance id.
   * @param input Patch payload.
   * @returns Updated ride instance with availability.
   */
  async update(id: string, input: UpdateRideInstanceInput): Promise<RideInstanceDTO> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new AppError('Ride instance not found', 404);
    }

    const routeId = input.routeId ?? existing.route_id;
    const vehicleId = input.vehicleId ?? existing.vehicle_id;
    const driverId = input.driverId === undefined ? existing.driver_id : input.driverId;
    await this.validateRouteVehicleDriver(routeId, vehicleId, driverId);

    const normalizedInput: UpdateRideInstanceInput = {
      ...input,
      departureTime:
        input.departureTime !== undefined
          ? this.normalizeDepartureTime(input.departureTime)
          : undefined,
    };

    const updated = await this.repo.update(id, normalizedInput);
    const availability = await this.repo.getAvailabilityByRideInstanceId(updated.id);
    if (!availability) {
      throw new AppError('Unable to fetch updated ride availability', 500);
    }
    const mapped = mapAvailability(availability);
    try {
      await realtimeService.updateRideStatus(mapped.id, this.mapRealtimeStatus(mapped.status));
    } catch {
      logStep('realtime ride status sync failed', { rideInstanceId: mapped.id });
    }
    return mapped;
  }

  /**
   * Soft-cancel ride instance.
   * @param id Ride instance id.
   * @returns Cancelled ride instance with availability projection.
   */
  async cancel(id: string): Promise<RideInstanceDTO> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new AppError('Ride instance not found', 404);
    }
    const cancelled = await this.repo.cancel(id);
    const availability = await this.repo.getAvailabilityByRideInstanceId(cancelled.id);
    if (!availability) {
      throw new AppError('Unable to fetch cancelled ride availability', 500);
    }
    const mapped = mapAvailability(availability);
    try {
      await realtimeService.updateRideStatus(mapped.id, this.mapRealtimeStatus(mapped.status));
    } catch {
      logStep('realtime ride cancel sync failed', { rideInstanceId: mapped.id });
    }
    return mapped;
  }

  /**
   * Validates actor access and syncs driver location to Firebase realtime path for a ride.
   */
  async updateRealtimeLocation(input: {
    rideInstanceId: string;
    actorUserId: string;
    actorRole: string;
    lat: number;
    lng: number;
    driverOnline: boolean;
  }): Promise<DriverLocationUpdateResult> {
    const ride = await this.repo.getById(input.rideInstanceId);
    if (!ride) {
      throw new AppError('Ride instance not found', 404);
    }

    if (!['scheduled', 'boarding', 'departed'].includes(ride.status)) {
      throw new AppError('Ride is not active for location updates', 409);
    }

    if (input.actorRole === 'driver' && ride.driver_id !== input.actorUserId) {
      throw new AppError('Forbidden', 403);
    }

    await realtimeService.updateDriverLocation(
      ride.id,
      input.lat,
      input.lng,
      input.driverOnline
    );

    return {
      rideInstanceId: ride.id,
      lat: input.lat,
      lng: input.lng,
      driverOnline: input.driverOnline,
      rideStatus: ride.status,
    };
  }
}

export const rideInstancesService = new RideInstancesService(rideInstancesRepository);
