import { pickupPointsService } from '@/lib/features/pickup-points/pickup-points.service';
import { rideInstancesRepository } from '@/lib/features/ride-instances/ride-instances.repository';
import { AppError } from '@/lib/utils/errors';
import { realtimeService } from '@/lib/features/realtime/realtime.service';
import { logStep } from '@/lib/utils/logger';
import { tripsRepository, TripsRepository } from './trips.repository';
import type { RiderTripDetailDTO, TripAvailabilityRecord, TripDTO } from './trips.types';

function mapTrip(record: TripAvailabilityRecord): TripDTO {
  return {
    id: record.id,
    tripId: record.trip_id,
    driverTripId: record.driver_trip_id,
    rideInstanceId: record.ride_instance_id,
    rideId: record.ride_id,
    routeId: record.route_id,
    driverId: record.driver_id,
    vehicleId: record.vehicle_id,
    rideDate: record.ride_date,
    departureTime: record.departure_time,
    estimatedDurationMinutes: record.estimated_duration_minutes,
    timeSlot: record.time_slot,
    status: record.status,
    capacity: record.capacity,
    reservedSeats: record.reserved_seats,
    availableSeats: record.available_seats,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export class TripsService {
  constructor(private readonly repo: TripsRepository) {}

  async listAvailableByRideInstanceIds(rideInstanceIds: string[]): Promise<Record<string, TripDTO[]>> {
    const rows = await this.repo.listAvailableByRideInstanceIds(rideInstanceIds);
    return Object.fromEntries(
      Object.entries(rows).map(([key, value]) => [key, value.map(mapTrip)])
    );
  }

  async listByRideInstanceId(rideInstanceId: string): Promise<TripDTO[]> {
    return (await this.repo.listByRideInstanceId(rideInstanceId)).map(mapTrip);
  }

  async getById(id: string): Promise<TripDTO | null> {
    const row = await this.repo.getById(id);
    return row ? mapTrip(row) : null;
  }

  async startTrip(id: string, actor: { userId: string; role: string }): Promise<TripDTO> {
    const trip = await this.repo.getRecordById(id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    if (actor.role !== 'driver') {
      throw new AppError('Only drivers can start trips', 403);
    }
    if (trip.driver_id !== actor.userId) {
      throw new AppError('Forbidden', 403);
    }
    if (trip.status !== 'scheduled') {
      throw new AppError('Only scheduled trips can be started', 409);
    }
    if (!trip.vehicle_id) {
      throw new AppError('Trip must have an assigned vehicle before it can be started', 409);
    }

    await this.repo.updateStatus(id, 'ongoing');
    try {
      await realtimeService.updateRideStatus(trip.ride_instance_id, 'ongoing');
    } catch {
      logStep('realtime trip start sync failed', { tripId: id, rideInstanceId: trip.ride_instance_id });
    }

    const updated = await this.repo.getById(id);
    if (!updated) {
      throw new AppError('Trip not found after start', 404);
    }
    return mapTrip(updated);
  }

  async completeTrip(id: string, actor: { userId: string; role: string }): Promise<TripDTO> {
    const trip = await this.repo.getRecordById(id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    const isAdmin = actor.role === 'admin' || actor.role === 'sub_admin';
    const isDriverOwner = actor.role === 'driver' && trip.driver_id === actor.userId;
    if (!isAdmin && !isDriverOwner) {
      throw new AppError('Forbidden', 403);
    }
    if (trip.status !== 'ongoing') {
      throw new AppError('Only ongoing trips can be completed', 409);
    }

    await this.repo.updateStatus(id, 'completed');
    try {
      await realtimeService.updateRideStatus(trip.ride_instance_id, 'completed');
    } catch {
      logStep('realtime trip completion sync failed', { tripId: id, rideInstanceId: trip.ride_instance_id });
    }

    const updated = await this.repo.getById(id);
    if (!updated) {
      throw new AppError('Trip not found after completion', 404);
    }
    return mapTrip(updated);
  }

  async cancelActiveByRideInstanceId(rideInstanceId: string): Promise<void> {
    await this.repo.cancelActiveByRideInstanceId(rideInstanceId);
  }

  async getRiderDetails(id: string): Promise<RiderTripDetailDTO> {
    const row = await this.repo.getDetailedById(id);
    if (!row) {
      throw new AppError('Trip not found', 404);
    }

    const rideDetails = await rideInstancesRepository.getDetailsById(row.ride_instance_id);
    if (!rideDetails) {
      throw new AppError('Ride instance not found', 404);
    }

    const pickupPoints = await pickupPointsService.listPickupPoints(rideDetails.route_id);

    return {
      id: row.id,
      tripId: row.trip_id,
      driverTripId: row.driver_trip_id,
      status: row.status,
      departureTime: row.departure_time,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      capacity: row.capacity,
      reservedSeats: row.reserved_seats,
      availableSeats: row.available_seats,
      rideInstance: {
        id: rideDetails.id,
        rideId: rideDetails.ride_id,
        rideDate: rideDetails.ride_date,
        timeSlot: rideDetails.time_slot,
        route: rideDetails.route
          ? {
              id: rideDetails.route.id,
              name: rideDetails.route.name,
              fromName: rideDetails.route.from_name,
              toName: rideDetails.route.to_name,
              fromLat: rideDetails.route.from_latitude,
              fromLng: rideDetails.route.from_longitude,
              toLat: rideDetails.route.to_latitude,
              toLng: rideDetails.route.to_longitude,
            }
          : null,
      },
      driver: row.driver
        ? {
            id: row.driver.id,
            firstName: row.driver.first_name,
            lastName: row.driver.last_name,
            email: row.driver.email,
            phone: row.driver.phone,
          }
        : null,
      vehicle: row.vehicle
        ? {
            id: row.vehicle.id,
            registrationNumber: row.vehicle.registration_number,
            model: row.vehicle.model,
            capacity: row.vehicle.capacity,
          }
        : null,
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

export const tripsService = new TripsService(tripsRepository);
