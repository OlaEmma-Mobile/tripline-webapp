import { describe, expect, it } from 'vitest';
import { TripsService } from './trips.service';
import { realtimeService } from '@/lib/features/realtime/realtime.service';
import { rideInstancesRepository } from '@/lib/features/ride-instances/ride-instances.repository';

function buildTrip(overrides: Partial<any> = {}) {
  return {
    id: 'trip-1',
    trip_id: 'TP-0001',
    driver_trip_id: 'DRV-0001',
    ride_instance_id: 'ride-1',
    ride_id: 'RD-0001',
    route_id: 'route-1',
    driver_id: 'driver-1',
    vehicle_id: 'vehicle-1',
    ride_date: '2026-03-28',
    departure_time: '08:00:00',
    estimated_duration_minutes: 60,
    time_slot: 'morning',
    status: 'ongoing',
    capacity: 14,
    reserved_seats: 4,
    available_seats: 10,
    created_at: '2026-03-28T07:00:00.000Z',
    updated_at: '2026-03-28T07:00:00.000Z',
    ...overrides,
  };
}

describe('TripsService.completeTrip', () => {
  it('updates realtime location for the assigned driver trip', async () => {
    const trip = buildTrip();
    const repo = {
      getById: async () => trip,
    };
    const service = new TripsService(repo as never);

    const originalUpdateTripLocation = realtimeService.updateTripLocation;
    const originalGetTripRealtimeState = realtimeService.getTripRealtimeState;
    const originalUpdateTripEligibility = realtimeService.updateTripEligibility;
    const originalUpdateTripArrivalState = realtimeService.updateTripArrivalState;
    const originalSyncRideProjectionFromTrip = realtimeService.syncRideProjectionFromTrip;
    const originalGetDetailsById = rideInstancesRepository.getDetailsById;
    let called = false;

    realtimeService.updateTripLocation = async () => {
      called = true;
    };
    realtimeService.getTripRealtimeState = async () =>
      ({
        driverId: 'driver-1',
        status: 'ongoing',
        driverOnline: true,
        location: {
          lat: 6.43,
          lng: 3.45,
          updatedAt: '2026-03-28T12:00:00.000Z',
        },
        eligibility: {
          readyToComplete: false,
          distanceToDestinationMeters: null,
          updatedAt: null,
        },
        arrivalEnteredAt: null,
      } as never);
    realtimeService.updateTripEligibility = async () => undefined;
    realtimeService.updateTripArrivalState = async () => undefined;
    realtimeService.syncRideProjectionFromTrip = async () => undefined;
    rideInstancesRepository.getDetailsById = async () =>
      ({
        route: {
          id: 'route-1',
          name: 'Test Route',
          from_name: 'Start',
          to_name: 'End',
          from_latitude: 6.5,
          from_longitude: 3.3,
          to_latitude: 6.43,
          to_longitude: 3.45,
        },
      } as never);

    const result = await service.updateRealtimeLocation({
      tripId: 'trip-1',
      actorUserId: 'driver-1',
      actorRole: 'driver',
      lat: 6.43,
      lng: 3.45,
      driverOnline: true,
      recordedAt: '2026-03-28T12:00:00.000Z',
    });

    expect(called).toBe(true);
    expect(result.tripId).toBe('trip-1');

    realtimeService.updateTripLocation = originalUpdateTripLocation;
    realtimeService.getTripRealtimeState = originalGetTripRealtimeState;
    realtimeService.updateTripEligibility = originalUpdateTripEligibility;
    realtimeService.updateTripArrivalState = originalUpdateTripArrivalState;
    realtimeService.syncRideProjectionFromTrip = originalSyncRideProjectionFromTrip;
    rideInstancesRepository.getDetailsById = originalGetDetailsById;
  });

  it('rejects location updates for a different driver', async () => {
    const trip = buildTrip();
    const repo = {
      getById: async () => trip,
    };
    const service = new TripsService(repo as never);

    await expect(
      service.updateRealtimeLocation({
        tripId: 'trip-1',
        actorUserId: 'driver-2',
        actorRole: 'driver',
        lat: 6.43,
        lng: 3.45,
        driverOnline: true,
      })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('completes an ongoing trip when eligibility passes', async () => {
    const trip = buildTrip();
    let currentStatus = 'ongoing';
    const repo = {
      getRecordById: async () => trip,
      getById: async () => ({ ...trip, status: currentStatus }),
      updateStatus: async () => {
        currentStatus = 'completed';
        return { ...trip, status: 'completed' };
      },
    };
    const service = new TripsService(repo as never);

    const originalGetDetailsById = rideInstancesRepository.getDetailsById;
    const originalGetTripRealtimeState = realtimeService.getTripRealtimeState;
    const originalUpdateTripEligibility = realtimeService.updateTripEligibility;
    const originalUpdateTripArrivalState = realtimeService.updateTripArrivalState;
    const originalSyncRideProjectionFromTrip = realtimeService.syncRideProjectionFromTrip;
    const originalUpdateTripStatus = realtimeService.updateTripStatus;

    rideInstancesRepository.getDetailsById = async () =>
      ({
        route: {
          id: 'route-1',
          name: 'Test Route',
          from_name: 'Start',
          to_name: 'End',
          from_latitude: 6.5,
          from_longitude: 3.3,
          to_latitude: 6.43,
          to_longitude: 3.45,
        },
      } as never);
    realtimeService.getTripRealtimeState = async () =>
      ({
        driverId: 'driver-1',
        status: 'ongoing',
        driverOnline: true,
        location: {
          lat: 6.43001,
          lng: 3.45001,
          updatedAt: new Date().toISOString(),
        },
        eligibility: {
          readyToComplete: false,
          distanceToDestinationMeters: null,
          updatedAt: null,
        },
        arrivalEnteredAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      } as never);
    realtimeService.updateTripEligibility = async () => undefined;
    realtimeService.updateTripArrivalState = async () => undefined;
    realtimeService.syncRideProjectionFromTrip = async () => undefined;
    realtimeService.updateTripStatus = async () => undefined;

    const result = await service.completeTrip('trip-1', { userId: 'driver-1', role: 'driver' });
    expect(result.status).toBe('completed');
    expect(result.completionEligibility.eligible).toBe(true);

    rideInstancesRepository.getDetailsById = originalGetDetailsById;
    realtimeService.getTripRealtimeState = originalGetTripRealtimeState;
    realtimeService.updateTripEligibility = originalUpdateTripEligibility;
    realtimeService.updateTripArrivalState = originalUpdateTripArrivalState;
    realtimeService.syncRideProjectionFromTrip = originalSyncRideProjectionFromTrip;
    realtimeService.updateTripStatus = originalUpdateTripStatus;
  });

  it('rejects normal completion when eligibility fails', async () => {
    const trip = buildTrip();
    const repo = {
      getRecordById: async () => trip,
      getById: async () => trip,
    };
    const service = new TripsService(repo as never);

    const originalGetDetailsById = rideInstancesRepository.getDetailsById;
    const originalGetTripRealtimeState = realtimeService.getTripRealtimeState;
    const originalUpdateTripEligibility = realtimeService.updateTripEligibility;
    const originalUpdateTripArrivalState = realtimeService.updateTripArrivalState;
    const originalSyncRideProjectionFromTrip = realtimeService.syncRideProjectionFromTrip;

    rideInstancesRepository.getDetailsById = async () =>
      ({
        route: {
          id: 'route-1',
          name: 'Test Route',
          from_name: 'Start',
          to_name: 'End',
          from_latitude: 6.5,
          from_longitude: 3.3,
          to_latitude: 6.43,
          to_longitude: 3.45,
        },
      } as never);
    realtimeService.getTripRealtimeState = async () =>
      ({
        driverId: 'driver-1',
        status: 'ongoing',
        driverOnline: true,
        location: {
          lat: 6.6,
          lng: 3.9,
          updatedAt: new Date().toISOString(),
        },
        eligibility: {
          readyToComplete: false,
          distanceToDestinationMeters: null,
          updatedAt: null,
        },
        arrivalEnteredAt: null,
      } as never);
    realtimeService.updateTripEligibility = async () => undefined;
    realtimeService.updateTripArrivalState = async () => undefined;
    realtimeService.syncRideProjectionFromTrip = async () => undefined;

    await expect(
      service.completeTrip('trip-1', { userId: 'driver-1', role: 'driver' })
    ).rejects.toMatchObject({ status: 409 });

    rideInstancesRepository.getDetailsById = originalGetDetailsById;
    realtimeService.getTripRealtimeState = originalGetTripRealtimeState;
    realtimeService.updateTripEligibility = originalUpdateTripEligibility;
    realtimeService.updateTripArrivalState = originalUpdateTripArrivalState;
    realtimeService.syncRideProjectionFromTrip = originalSyncRideProjectionFromTrip;
  });

  it('allows admin override completion when eligibility fails', async () => {
    const trip = buildTrip();
    let currentStatus = 'ongoing';
    const repo = {
      getRecordById: async () => trip,
      getById: async () => ({ ...trip, status: currentStatus }),
      updateStatus: async () => {
        currentStatus = 'completed';
        return { ...trip, status: 'completed' };
      },
    };
    const service = new TripsService(repo as never);

    const originalGetDetailsById = rideInstancesRepository.getDetailsById;
    const originalGetTripRealtimeState = realtimeService.getTripRealtimeState;
    const originalUpdateTripEligibility = realtimeService.updateTripEligibility;
    const originalUpdateTripArrivalState = realtimeService.updateTripArrivalState;
    const originalSyncRideProjectionFromTrip = realtimeService.syncRideProjectionFromTrip;
    const originalUpdateTripStatus = realtimeService.updateTripStatus;

    rideInstancesRepository.getDetailsById = async () =>
      ({
        route: {
          id: 'route-1',
          name: 'Test Route',
          from_name: 'Start',
          to_name: 'End',
          from_latitude: 6.5,
          from_longitude: 3.3,
          to_latitude: 6.43,
          to_longitude: 3.45,
        },
      } as never);
    realtimeService.getTripRealtimeState = async () =>
      ({
        driverId: 'driver-1',
        status: 'ongoing',
        driverOnline: true,
        location: {
          lat: 6.7,
          lng: 4.1,
          updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
        eligibility: {
          readyToComplete: false,
          distanceToDestinationMeters: null,
          updatedAt: null,
        },
        arrivalEnteredAt: null,
      } as never);
    realtimeService.updateTripEligibility = async () => undefined;
    realtimeService.updateTripArrivalState = async () => undefined;
    realtimeService.syncRideProjectionFromTrip = async () => undefined;
    realtimeService.updateTripStatus = async () => undefined;

    const result = await service.completeTrip(
      'trip-1',
      { userId: 'admin-1', role: 'admin' },
      'override'
    );

    expect(result.status).toBe('completed');
    expect(result.completionEligibility.eligible).toBe(false);

    rideInstancesRepository.getDetailsById = originalGetDetailsById;
    realtimeService.getTripRealtimeState = originalGetTripRealtimeState;
    realtimeService.updateTripEligibility = originalUpdateTripEligibility;
    realtimeService.updateTripArrivalState = originalUpdateTripArrivalState;
    realtimeService.syncRideProjectionFromTrip = originalSyncRideProjectionFromTrip;
    realtimeService.updateTripStatus = originalUpdateTripStatus;
  });
});
