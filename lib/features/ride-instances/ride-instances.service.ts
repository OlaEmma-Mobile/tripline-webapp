import { AppError } from '@/lib/utils/errors';
import { logStep } from '@/lib/utils/logger';
import { realtimeService } from '@/lib/features/realtime/realtime.service';
import { assignmentsRepository } from '@/lib/features/assignments/assignments.repository';
import { tripsService } from '@/lib/features/trips/trips.service';
import { rideInstancesRepository, RideInstancesRepository } from './ride-instances.repository';
import type {
  CreateRideInstanceInput,
  CreateRideInstancesBulkInput,
  CreateRideInstancesForSlotsInput,
  DriverLocationUpdateResult,
  RideInstanceRecord,
  RideInstanceDTO,
  RideInstanceFilters,
  RiderRideInstanceDetailDTO,
  UpdateRideInstanceInput,
} from './ride-instances.types';
import { pickupPointsService } from '@/lib/features/pickup-points/pickup-points.service';

/**
 * mapAvailability Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapRideRecord(record: RideInstanceRecord): RideInstanceDTO {
  return {
    id: record.id,
    rideId: record.ride_id,
    routeId: record.route_id,
    vehicleId: record.vehicle_id,
    rideDate: record.ride_date,
    departureTime: record.departure_time,
    timeSlot: record.time_slot,
    status: record.status,
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
   * Validates that referenced route and vehicle exist and are active.
   * @param routeId Route id.
   * @param vehicleId Vehicle id.
   * @param driverId Optional driver id.
   */
  private async validateRoute(routeId: string): Promise<void> {
    const route = await this.repo.getRoute(routeId);
    if (!route) throw new AppError('Route not found', 404);
    if (route.status !== 'available' && route.status !== 'active') {
      throw new AppError('Route must be available for ride scheduling', 400);
    }
  }

  /**
   * Create one ride instance and return scheduling record.
   * @param input Validated create payload.
   * @returns Created ride instance with computed availability.
   */
  async create(input: CreateRideInstanceInput): Promise<RideInstanceDTO> {
    await this.validateRoute(input.routeId);
    const created = await this.repo.create(input);
    const mapped = mapRideRecord(created);
    try {
      await realtimeService.updateRideStatus(mapped.id, mapped.status);
    } catch {
      logStep('realtime ride create sync failed', { rideInstanceId: mapped.id });
    }
    return mapped;
  }

  async createForSlots(input: CreateRideInstancesForSlotsInput): Promise<RideInstanceDTO[]> {
    await this.validateRoute(input.routeId);
    const rows = input.timeSlots.map((timeSlot) => ({
      routeId: input.routeId,
      rideDate: input.rideDate,
      timeSlot,
      status: input.status,
    }));

    const created = await this.repo.createBulk(rows);
    const results = created.map(mapRideRecord);
    for (const mapped of results) {
      try {
        await realtimeService.updateRideStatus(mapped.id, mapped.status);
      } catch {
        logStep('realtime ride multi-create sync failed', { rideInstanceId: mapped.id });
      }
    }
    return results;
  }

  /**
   * Create multiple ride instances for one date and return scheduling rows.
   * @param input Validated bulk payload.
   * @returns Created ride instances with availability.
   */
  async createBulk(input: CreateRideInstancesBulkInput): Promise<RideInstanceDTO[]> {
    await this.validateRoute(input.routeId);
    const rows = [({
      routeId: input.routeId,
      rideDate: input.rideDate,
      timeSlot: input.timeSlot,
      status: input.status,
    })];

    const created = await this.repo.createBulk(rows);
    const results: RideInstanceDTO[] = created.map(mapRideRecord);
    for (const mapped of results) {
      try {
        await realtimeService.updateRideStatus(mapped.id, mapped.status);
      } catch {
        logStep('realtime ride bulk-create sync failed', { rideInstanceId: mapped.id });
      }
    }
    return results;
  }

  /**
   * List ride instances with any currently bookable trips nested under them.
   * @param filters Pagination and query filters.
   * @returns Paginated ride availability data.
   */
  async list(filters: RideInstanceFilters): Promise<{ items: RideInstanceDTO[]; total: number }> {
    const { items, total } = await this.repo.listRecords(filters);
    const mapped = items.map(mapRideRecord);
    const tripsByRide = await tripsService.listAvailableByRideInstanceIds(mapped.map((item) => item.id));
    return {
      items: mapped.map((item) => ({
        ...item,
        trips: (tripsByRide[item.id] ?? []).map((trip) => ({
          id: trip.id,
          tripId: trip.tripId,
          driverTripId: trip.driverTripId,
          driverId: trip.driverId,
          vehicleId: trip.vehicleId,
          departureTime: trip.departureTime,
          estimatedDurationMinutes: trip.estimatedDurationMinutes,
          status: trip.status,
          capacity: trip.capacity,
          reservedSeats: trip.reservedSeats,
          availableSeats: trip.availableSeats,
        })),
      })),
      total,
    };
  }

  /**
   * Lists ride instances with admin-specific display enrichments.
   */
  async listAdmin(filters: RideInstanceFilters): Promise<{ items: RideInstanceDTO[]; total: number }> {
    const { items, total } = await this.repo.listRecords(filters);
    const mapped = items.map(mapRideRecord);

    const routeIds = [...new Set(mapped.map((item) => item.routeId))];
    const rideIds = mapped.map((item) => item.id);
    const tripsByRide = await tripsService.listAvailableByRideInstanceIds(rideIds);
    const vehicleIds = [
      ...new Set(
        Object.values(tripsByRide)
          .flat()
          .map((trip) => trip.vehicleId)
          .filter((value): value is string => Boolean(value))
      ),
    ];
    const [routeNames, vehiclePlates, driverNamesByRide, pickupCounts] = await Promise.all([
      this.repo.getRouteNames(routeIds),
      this.repo.getVehiclePlates(vehicleIds),
      this.repo.getAssignedDriverNamesByRideInstanceIds(rideIds),
      this.repo.getPickupPointCounts(routeIds),
    ]);

    return {
      total,
      items: mapped.map((item) => ({
        ...item,
        routeName: routeNames[item.routeId] ?? item.routeId,
        vehiclePlate:
          (tripsByRide[item.id]?.[0]?.vehicleId
            ? vehiclePlates[tripsByRide[item.id][0].vehicleId as string] ?? tripsByRide[item.id][0].vehicleId
            : item.vehicleId
              ? vehiclePlates[item.vehicleId] ?? item.vehicleId
              : null),
        driverNames: driverNamesByRide[item.id] ?? [],
        assignedDriverCount: (driverNamesByRide[item.id] ?? []).length,
        pickupPointsCount: pickupCounts[item.routeId] ?? 0,
        trips: (tripsByRide[item.id] ?? []).map((trip) => ({
          id: trip.id,
          tripId: trip.tripId,
          driverTripId: trip.driverTripId,
          driverId: trip.driverId,
          vehicleId: trip.vehicleId,
          departureTime: trip.departureTime,
          estimatedDurationMinutes: trip.estimatedDurationMinutes,
          status: trip.status,
          capacity: trip.capacity,
          reservedSeats: trip.reservedSeats,
          availableSeats: trip.availableSeats,
        })),
      })),
    };
  }

  /**
   * Returns route-specific ride templates with bookable trips nested under them.
   * @param routeId Route id.
   * @param rideDate Service date in YYYY-MM-DD format.
   * @returns Ride instances with computed availability for the route/date.
   */
  async getRouteAvailability(routeId: string, rideDate: string): Promise<RideInstanceDTO[]> {
    const route = await this.repo.getRoute(routeId);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    const { items } = await this.list({
      page: 1,
      limit: 200,
      routeId,
      rideDate,
      statuses: ['scheduled'],
    });
    return items.filter((item) => (item.trips?.length ?? 0) > 0);
  }

  /**
   * Update ride instance and return scheduling record.
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
    await this.validateRoute(routeId);

    if (input.vehicleId) {
      const vehicle = await this.repo.getVehicle(input.vehicleId);
      if (!vehicle) throw new AppError('Vehicle not found', 404);
      if (vehicle.status !== 'active') throw new AppError('Vehicle must be active for ride scheduling', 400);
    }

    const updated = await this.repo.update(id, input);
    const mapped = mapRideRecord(updated);
    try {
      await realtimeService.updateRideStatus(mapped.id, mapped.status);
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
    await tripsService.cancelActiveByRideInstanceId(id);
    const mapped = mapRideRecord(cancelled);
    try {
      await realtimeService.updateRideStatus(mapped.id, mapped.status);
    } catch {
      logStep('realtime ride cancel sync failed', { rideInstanceId: mapped.id });
    }
    return mapped;
  }

  /**
   * Cancels active ride instances, or permanently deletes already-cancelled ones.
   * @param id Ride instance id.
   */
  async deleteOrCancel(id: string): Promise<{ action: 'cancelled' | 'deleted'; ride?: RideInstanceDTO }> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new AppError('Ride instance not found', 404);
    }

    if (existing.status === 'cancelled') {
      await this.repo.hardDelete(id);
      try {
        await realtimeService.deleteRideState(id);
      } catch {
        logStep('realtime ride delete sync failed', { rideInstanceId: id });
      }
      return { action: 'deleted' };
    }

    const ride = await this.cancel(id);
    return { action: 'cancelled', ride };
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

    if (ride.status !== 'scheduled') {
      throw new AppError('Ride is not active for location updates', 409);
    }

    if (
      input.actorRole === 'driver' &&
      !(await assignmentsRepository.isDriverAssignedToRide(ride.id, input.actorUserId))
    ) {
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

  /**
   * Returns rider-facing ride instance details with pickup points and bookable trips.
   */
  async getRiderDetails(rideInstanceId: string): Promise<RiderRideInstanceDetailDTO> {
    const details = await this.repo.getDetailsById(rideInstanceId);
    if (!details) {
      throw new AppError('Ride instance not found', 404);
    }

    const pickupPoints = await pickupPointsService.listPickupPoints(details.route_id);
    const trips = await tripsService.listByRideInstanceId(rideInstanceId);
    return {
      id: details.id,
      rideId: details.ride_id,
      rideDate: details.ride_date,
      timeSlot: details.time_slot,
      status: details.status,
      route: details.route,
      drivers: details.drivers,
      vehicle: details.vehicle,
      trips: trips.map((trip) => ({
        id: trip.id,
        tripId: trip.tripId,
        driverTripId: trip.driverTripId,
        driverId: trip.driverId,
        vehicleId: trip.vehicleId,
        departureTime: trip.departureTime,
        estimatedDurationMinutes: trip.estimatedDurationMinutes,
        status: trip.status,
        capacity: trip.capacity,
        reservedSeats: trip.reservedSeats,
        availableSeats: trip.availableSeats,
      })),
      pickupPoints: pickupPoints.map((point) => ({
        id: point.id,
        name: point.name,
        latitude: point.latitude,
        longitude: point.longitude,
        orderIndex: point.orderIndex,
        tokenCost: point.tokenCost,
      })),
    };
  }
}

export const rideInstancesService = new RideInstancesService(rideInstancesRepository);
