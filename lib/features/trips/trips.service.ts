import { pickupPointsService } from '@/lib/features/pickup-points/pickup-points.service';
import { rideInstancesRepository } from '@/lib/features/ride-instances/ride-instances.repository';
import { AppError } from '@/lib/utils/errors';
import { realtimeService } from '@/lib/features/realtime/realtime.service';
import { logStep } from '@/lib/utils/logger';
import { tripsRepository, TripsRepository } from './trips.repository';
import type {
  RiderTripDetailDTO,
  TripAvailabilityRecord,
  TripCompletionEligibility,
  TripCompletionMode,
  TripDTO,
  TripLocationUpdateResult,
  TripRealtimeSnapshot,
} from './trips.types';

const DESTINATION_RADIUS_METERS = 200;
const MIN_DURATION_RATIO = 0.6;
const DWELL_TIME_MS = 3 * 60 * 1000;
const GPS_FRESHNESS_MS = 2 * 60 * 1000;

function haversineDistanceMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}

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
  constructor(private readonly repo: TripsRepository) { }

  private async buildRealtimeSnapshot(
    trip: TripAvailabilityRecord
  ): Promise<TripRealtimeSnapshot> {
    const state = await realtimeService.getTripRealtimeState(trip.id);
    return {
      tripId: trip.id,
      rideInstanceId: trip.ride_instance_id,
      driverId: state?.driverId ?? trip.driver_id,
      status: state?.status ?? trip.status,
      driverOnline: state?.driverOnline ?? false,
      location: {
        lat: state?.location.lat ?? null,
        lng: state?.location.lng ?? null,
        updatedAt: state?.location.updatedAt ?? null,
      },
      eligibility: {
        readyToComplete: state?.eligibility.readyToComplete ?? false,
        distanceToDestinationMeters: state?.eligibility.distanceToDestinationMeters ?? null,
        updatedAt: state?.eligibility.updatedAt ?? null,
      },
    };
  }

  private async computeCompletionEligibility(
    trip: TripAvailabilityRecord,
    now = new Date()
  ): Promise<TripCompletionEligibility> {
    const rideDetails = await rideInstancesRepository.getDetailsById(trip.ride_instance_id);
    if (!rideDetails?.route) {
      return {
        eligible: false,
        readyToComplete: false,
        nearDestination: false,
        withinDwellWindow: false,
        durationThresholdMet: false,
        gpsFresh: false,
        distanceToDestinationMeters: null,
        lastLocationAt: null,
      };
    }

    const realtimeState = await realtimeService.getTripRealtimeState(trip.id);
    const lat = realtimeState?.location.lat ?? null;
    const lng = realtimeState?.location.lng ?? null;
    const lastLocationAt = realtimeState?.location.updatedAt ?? null;

    const hasCoordinates = lat !== null && lng !== null;
    const locationUpdatedAt = lastLocationAt ? new Date(lastLocationAt) : null;
    const gpsFresh =
      locationUpdatedAt !== null &&
      !Number.isNaN(locationUpdatedAt.getTime()) &&
      now.getTime() - locationUpdatedAt.getTime() <= GPS_FRESHNESS_MS;

    const distanceToDestinationMeters = hasCoordinates
      ? haversineDistanceMeters(
          lat,
          lng,
          rideDetails.route.to_latitude,
          rideDetails.route.to_longitude
        )
      : null;

    const nearDestination =
      distanceToDestinationMeters !== null && distanceToDestinationMeters <= DESTINATION_RADIUS_METERS;

    const startedAt = new Date(trip.updated_at);
    const durationThresholdMs = Math.max(
      trip.estimated_duration_minutes * 60 * 1000 * MIN_DURATION_RATIO,
      0
    );
    const durationThresholdMet =
      !Number.isNaN(startedAt.getTime()) && now.getTime() - startedAt.getTime() >= durationThresholdMs;

    let arrivalEnteredAt = realtimeState?.arrivalEnteredAt ?? null;
    if (nearDestination && !arrivalEnteredAt) {
      arrivalEnteredAt = now.toISOString();
      await realtimeService.updateTripArrivalState(trip.id, arrivalEnteredAt);
    }
    if (!nearDestination && arrivalEnteredAt) {
      arrivalEnteredAt = null;
      await realtimeService.updateTripArrivalState(trip.id, null);
    }

    const dwellStartedAt = arrivalEnteredAt ? new Date(arrivalEnteredAt) : null;
    const withinDwellWindow =
      dwellStartedAt !== null &&
      !Number.isNaN(dwellStartedAt.getTime()) &&
      now.getTime() - dwellStartedAt.getTime() >= DWELL_TIME_MS;

    const eligible =
      trip.status === 'ongoing' &&
      gpsFresh &&
      nearDestination &&
      durationThresholdMet &&
      withinDwellWindow;

    const eligibility = {
      eligible,
      readyToComplete: eligible,
      nearDestination,
      withinDwellWindow,
      durationThresholdMet,
      gpsFresh,
      distanceToDestinationMeters:
        distanceToDestinationMeters === null ? null : Math.round(distanceToDestinationMeters),
      lastLocationAt,
    };

    await realtimeService.updateTripEligibility(trip.id, eligibility);
    await realtimeService.syncRideProjectionFromTrip({
      tripId: trip.id,
      rideInstanceId: trip.ride_instance_id,
      driverId: trip.driver_id,
      status: trip.status,
      driverOnline: realtimeState?.driverOnline ?? false,
      location: {
        lat,
        lng,
        updatedAt: lastLocationAt,
      },
      eligibility,
    });

    return eligibility;
  }

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
    const rideInstance = await rideInstancesRepository.getById(trip.ride_instance_id);
    if (!rideInstance) {
      throw new AppError('Ride instance not found', 404);
    }

    const departureAt = new Date(`${rideInstance.ride_date}T${trip.departure_time}+01:00`);
    const startWindowAt = new Date(departureAt.getTime() - 10 * 60 * 1000);
    if (Number.isNaN(departureAt.getTime())) {
      throw new AppError('Trip departure schedule is invalid', 500);
    }
    // if (new Date() < startWindowAt) {
    //   throw new AppError('Trip can only be started within 10 minutes of departure time', 409);
    // }

    await this.repo.updateStatus(id, 'ongoing');
    try {
      await realtimeService.updateTripStatus({
        tripId: id,
        rideInstanceId: trip.ride_instance_id,
        driverId: trip.driver_id,
        status: 'ongoing',
      });
    } catch {
      logStep('realtime trip start sync failed', { tripId: id, rideInstanceId: trip.ride_instance_id });
    }

    const updated = await this.repo.getById(id);
    if (!updated) {
      throw new AppError('Trip not found after start', 404);
    }
    return mapTrip(updated);
  }

  async getCompletionEligibility(
    id: string,
    actor?: { userId: string; role: string }
  ): Promise<TripCompletionEligibility> {
    const trip = await this.repo.getById(id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    if (actor) {
      const isAdmin = actor.role === 'admin' || actor.role === 'sub_admin';
      const isDriverOwner = actor.role === 'driver' && trip.driver_id === actor.userId;
      const isRider = actor.role === 'rider';
      if (!isAdmin && !isDriverOwner && !isRider) {
        throw new AppError('Forbidden', 403);
      }
    }
    return this.computeCompletionEligibility(trip);
  }

  async getRealtimeSnapshot(id: string): Promise<TripRealtimeSnapshot> {
    const trip = await this.repo.getById(id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    return this.buildRealtimeSnapshot(trip);
  }

  async updateRealtimeLocation(input: {
    tripId: string;
    actorUserId: string;
    actorRole: string;
    lat: number;
    lng: number;
    driverOnline: boolean;
    recordedAt?: string;
  }): Promise<TripLocationUpdateResult> {
    const trip = await this.repo.getById(input.tripId);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    const isAdmin = input.actorRole === 'admin' || input.actorRole === 'sub_admin';
    const isDriverOwner = input.actorRole === 'driver' && trip.driver_id === input.actorUserId;
    if (!isAdmin && !isDriverOwner) {
      throw new AppError('Forbidden', 403);
    }
    if (trip.status !== 'ongoing') {
      throw new AppError('Trip is not active for location updates', 409);
    }

    const recordedAt = input.recordedAt ?? new Date().toISOString();
    await realtimeService.updateTripLocation({
      tripId: trip.id,
      rideInstanceId: trip.ride_instance_id,
      driverId: trip.driver_id,
      status: trip.status,
      lat: input.lat,
      lng: input.lng,
      driverOnline: input.driverOnline,
      recordedAt,
    });

    const completionEligibility = await this.computeCompletionEligibility(trip);

    return {
      tripId: trip.id,
      rideInstanceId: trip.ride_instance_id,
      lat: input.lat,
      lng: input.lng,
      driverOnline: input.driverOnline,
      recordedAt,
      tripStatus: trip.status,
      completionEligibility,
    };
  }

  async completeTrip(
    id: string,
    actor: { userId: string; role: string },
    mode: TripCompletionMode = 'normal'
  ): Promise<TripDTO & { completionEligibility: TripCompletionEligibility }> {
    const trip = await this.repo.getById(id);
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

    const completionEligibility = await this.computeCompletionEligibility(trip);
    if (mode !== 'override' && !completionEligibility.eligible) {
      throw new AppError(
        JSON.stringify({
          message: 'Trip is not eligible for completion',
          completionEligibility,
        }),
        409
      );
    }
    if (mode === 'override' && !isAdmin) {
      throw new AppError('Only admin users can override trip completion eligibility', 403);
    }

    await this.repo.updateStatus(id, 'completed');
    try {
      await realtimeService.updateTripStatus({
        tripId: id,
        rideInstanceId: trip.ride_instance_id,
        driverId: trip.driver_id,
        status: 'completed',
      });
    } catch {
      logStep('realtime trip completion sync failed', { tripId: id, rideInstanceId: trip.ride_instance_id });
    }

    const updated = await this.repo.getById(id);
    if (!updated) {
      throw new AppError('Trip not found after completion', 404);
    }
    return {
      ...mapTrip(updated),
      completionEligibility,
    };
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

    const completionEligibility = await this.computeCompletionEligibility(row);

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
      completionEligibility,
    };
  }
}

export const tripsService = new TripsService(tripsRepository);
