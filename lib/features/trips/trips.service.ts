import { tripsRepository, TripsRepository } from './trips.repository';
import type { TripAvailabilityRecord, TripDTO } from './trips.types';

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
}

export const tripsService = new TripsService(tripsRepository);
