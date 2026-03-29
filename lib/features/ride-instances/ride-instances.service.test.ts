import { describe, expect, it } from 'vitest';
import { RideInstancesService } from './ride-instances.service';
import { realtimeService } from '@/lib/features/realtime/realtime.service';

describe('RideInstancesService.updateRealtimeLocation', () => {
  it('driver can update own assigned ride', async () => {
    const originalRealtime = realtimeService.updateDriverLocation;
    let called = false;
    realtimeService.updateDriverLocation = async () => {
      called = true;
    };

    const service = new RideInstancesService({
      getById: async () => ({
        id: 'ride-1',
        route_id: 'route-1',
        vehicle_id: 'vehicle-1',
        driver_id: 'driver-1',
        ride_date: '2026-02-16',
        departure_time: '06:30:00',
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    } as never);

    const result = await service.updateRealtimeLocation({
      rideInstanceId: 'ride-1',
      actorUserId: 'driver-1',
      actorRole: 'driver',
      lat: 6.43,
      lng: 3.45,
      driverOnline: true,
    });

    expect(result.rideInstanceId).toBe('ride-1');
    expect(called).toBe(true);
    realtimeService.updateDriverLocation = originalRealtime;
  });

  it('driver cannot update unassigned ride', async () => {
    const service = new RideInstancesService({
      getById: async () => ({
        id: 'ride-2',
        route_id: 'route-1',
        vehicle_id: 'vehicle-1',
        driver_id: 'driver-x',
        ride_date: '2026-02-16',
        departure_time: '06:30:00',
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    } as never);

    await expect(
      service.updateRealtimeLocation({
        rideInstanceId: 'ride-2',
        actorUserId: 'driver-1',
        actorRole: 'driver',
        lat: 6.43,
        lng: 3.45,
        driverOnline: true,
      })
    ).rejects.toMatchObject({ message: 'Forbidden', status: 403 });
  });

  it('admin can update ride location', async () => {
    const originalRealtime = realtimeService.updateDriverLocation;
    let called = false;
    realtimeService.updateDriverLocation = async () => {
      called = true;
    };

    const service = new RideInstancesService({
      getById: async () => ({
        id: 'ride-3',
        route_id: 'route-1',
        vehicle_id: 'vehicle-1',
        driver_id: 'driver-x',
        ride_date: '2026-02-16',
        departure_time: '06:30:00',
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    } as never);

    await service.updateRealtimeLocation({
      rideInstanceId: 'ride-3',
      actorUserId: 'admin-1',
      actorRole: 'admin',
      lat: 6.43,
      lng: 3.45,
      driverOnline: true,
    });

    expect(called).toBe(true);
    realtimeService.updateDriverLocation = originalRealtime;
  });

  it('rejects non-active rides for location updates', async () => {
    const service = new RideInstancesService({
      getById: async () => ({
        id: 'ride-4',
        route_id: 'route-1',
        vehicle_id: 'vehicle-1',
        driver_id: 'driver-1',
        ride_date: '2026-02-16',
        departure_time: '06:30:00',
        status: 'cancelled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    } as never);

    await expect(
      service.updateRealtimeLocation({
        rideInstanceId: 'ride-4',
        actorUserId: 'driver-1',
        actorRole: 'driver',
        lat: 6.43,
        lng: 3.45,
        driverOnline: true,
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('returns not found when ride is missing', async () => {
    const service = new RideInstancesService({
      getById: async () => null,
    } as never);

    await expect(
      service.updateRealtimeLocation({
        rideInstanceId: 'ride-missing',
        actorUserId: 'driver-1',
        actorRole: 'driver',
        lat: 6.43,
        lng: 3.45,
        driverOnline: true,
      })
    ).rejects.toMatchObject({ status: 404 });
  });
});
