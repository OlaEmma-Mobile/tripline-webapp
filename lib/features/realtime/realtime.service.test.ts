import { describe, expect, it } from 'vitest';
import { RealtimeService } from './realtime.service';
import { notificationsService } from '@/lib/features/notifications/notifications.service';

function createMockDb(existingNotifications: Record<string, unknown> = {}) {
  const writes: Array<{ path: string; value: unknown }> = [];
  const db = {
    ref(path: string) {
      return {
        async set(value: unknown): Promise<void> {
          writes.push({ path, value });
        },
        async get(): Promise<{ exists(): boolean }> {
          return { exists: () => Boolean(existingNotifications[path]) };
        },
        child(childPath: string) {
          return {
            async set(value: unknown): Promise<void> {
              writes.push({ path: `${path}/${childPath}`, value });
            },
            async get(): Promise<{ exists(): boolean }> {
              return { exists: () => Boolean(existingNotifications[`${path}/${childPath}`]) };
            },
            child() {
              throw new Error('Nested child not needed in test');
            },
          };
        },
      };
    },
  };
  return { db, writes };
}

describe('RealtimeService', () => {
  it('writes ride status path', async () => {
    const { db, writes } = createMockDb();
    const service = new RealtimeService(
      { getFcmToken: async () => null, clearFcmToken: async () => undefined } as never,
      {
        getDb: () => db as never,
        getMessaging: () => ({ send: async () => 'msg-1' }) as never,
      }
    );

    await service.updateRideStatus('ride-1', 'ongoing');
    expect(writes[0]).toMatchObject({
      path: 'realtime/rides/ride-1/status',
      value: 'ongoing',
    });
  });

  it('writes trip status and compatibility ride projection', async () => {
    const { db, writes } = createMockDb();
    const service = new RealtimeService(
      { getFcmToken: async () => null, clearFcmToken: async () => undefined } as never,
      {
        getDb: () => db as never,
        getMessaging: () => ({ send: async () => 'msg-1' }) as never,
      }
    );

    await service.updateTripStatus({
      tripId: 'trip-1',
      rideInstanceId: 'ride-1',
      driverId: 'driver-1',
      status: 'ongoing',
    });

    expect(writes.some((entry) => entry.path === 'realtime/trips/trip-1/status' && entry.value === 'ongoing')).toBe(true);
    expect(writes.some((entry) => entry.path === 'realtime/rides/ride-1/tripId' && entry.value === 'trip-1')).toBe(true);
  });

  it('writes location + online flag', async () => {
    const { db, writes } = createMockDb();
    const service = new RealtimeService(
      { getFcmToken: async () => null, clearFcmToken: async () => undefined } as never,
      {
        getDb: () => db as never,
        getMessaging: () => ({ send: async () => 'msg-1' }) as never,
      }
    );

    await service.updateDriverLocation('ride-2', 6.43, 3.45, true);
    expect(writes[0]).toMatchObject({
      path: 'realtime/rides/ride-2/driverOnline',
      value: true,
    });
    expect(writes[1]).toMatchObject({
      path: 'realtime/rides/ride-2/location',
      value: { lat: 6.43, lng: 3.45 },
    });
  });

  it('writes trip-scoped location through the backend relay path', async () => {
    const { db, writes } = createMockDb();
    const service = new RealtimeService(
      { getFcmToken: async () => null, clearFcmToken: async () => undefined } as never,
      {
        getDb: () => db as never,
        getMessaging: () => ({ send: async () => 'msg-1' }) as never,
      }
    );

    await service.updateTripLocation({
      tripId: 'trip-2',
      rideInstanceId: 'ride-2',
      driverId: 'driver-1',
      status: 'ongoing',
      lat: 6.43,
      lng: 3.45,
      driverOnline: true,
      recordedAt: '2026-03-28T12:00:00.000Z',
    });

    expect(writes.some((entry) => entry.path === 'realtime/trips/trip-2/location')).toBe(true);
    expect(
      writes.some(
        (entry) =>
          entry.path === 'realtime/rides/ride-2/location' &&
          JSON.stringify(entry.value) ===
            JSON.stringify({ lat: 6.43, lng: 3.45, updatedAt: '2026-03-28T12:00:00.000Z' })
      )
    ).toBe(true);
  });

  it('writes trip eligibility snapshot', async () => {
    const { db, writes } = createMockDb();
    const service = new RealtimeService(
      { getFcmToken: async () => null, clearFcmToken: async () => undefined } as never,
      {
        getDb: () => db as never,
        getMessaging: () => ({ send: async () => 'msg-1' }) as never,
      }
    );

    await service.updateTripEligibility('trip-2', {
      eligible: true,
      readyToComplete: true,
      nearDestination: true,
      withinDwellWindow: true,
      durationThresholdMet: true,
      gpsFresh: true,
      distanceToDestinationMeters: 42,
      lastLocationAt: '2026-03-28T12:00:00.000Z',
    });

    expect(writes[writes.length - 1]).toMatchObject({
      path: 'realtime/trips/trip-2/eligibility',
    });
  });

  it('sends push only when token exists', async () => {
    const { db } = createMockDb();
    const service = new RealtimeService(
      { getFcmToken: async () => 'token-1', clearFcmToken: async () => undefined } as never,
      {
        getDb: () => db as never,
        getMessaging: () => ({ send: async () => 'msg-123' }) as never,
      }
    );

    const result = await service.sendPushNotification('user-1', 'title', 'body');
    expect(result).toMatchObject({ sent: true, messageId: 'msg-123' });
  });

  it('no-op push when token is missing', async () => {
    const { db } = createMockDb();
    const service = new RealtimeService(
      { getFcmToken: async () => null, clearFcmToken: async () => undefined } as never,
      {
        getDb: () => db as never,
        getMessaging: () => ({ send: async () => 'msg-ignored' }) as never,
      }
    );

    const result = await service.sendPushNotification('user-2', 'title', 'body');
    expect(result).toMatchObject({ sent: false, messageId: null });
  });

  it('notification create is idempotent for same reference+reason', async () => {
    const existing = {
      'realtime/notifications/user-1/booking-1_RIDE_BOARDED': true,
    };
    const { db, writes } = createMockDb(existing);
    const service = new RealtimeService(
      { getFcmToken: async () => null, clearFcmToken: async () => undefined } as never,
      {
        getDb: () => db as never,
        getMessaging: () => ({ send: async () => 'msg-1' }) as never,
      }
    );

    const result = await service.createUserNotification({
      userId: 'user-1',
      type: 'booking_status',
      message: 'sample',
      reference: 'booking-1',
      reason: 'RIDE_BOARDED',
    });

    expect(result).toMatchObject({ notificationId: 'booking-1_RIDE_BOARDED', created: false });
    expect(writes.length).toBe(0);
  });

  it('persists postgres notification before realtime mirror + push', async () => {
    const { db } = createMockDb();
    const service = new RealtimeService(
      { getFcmToken: async () => 'token-1', clearFcmToken: async () => undefined } as never,
      {
        getDb: () => db as never,
        getMessaging: () => ({ send: async () => 'msg-999' }) as never,
      }
    );

    const originalCreate = notificationsService.createNotification;
    let persisted = false;
    notificationsService.createNotification = async () => {
      persisted = true;
      return { id: 'n-1', created: true };
    };

    await service.notifyBookingStatusChange({
      userId: 'user-1',
      bookingId: 'booking-1',
      status: 'boarded',
    });

    expect(persisted).toBe(true);
    notificationsService.createNotification = originalCreate;
  });

  it('fails when postgres notification persistence fails', async () => {
    const { db } = createMockDb();
    const service = new RealtimeService(
      { getFcmToken: async () => 'token-1', clearFcmToken: async () => undefined } as never,
      {
        getDb: () => db as never,
        getMessaging: () => ({ send: async () => 'msg-999' }) as never,
      }
    );

    const originalCreate = notificationsService.createNotification;
    notificationsService.createNotification = async () => {
      throw new Error('db down');
    };

    await expect(
      service.notifyBookingStatusChange({
        userId: 'user-1',
        bookingId: 'booking-1',
        status: 'boarded',
      })
    ).rejects.toMatchObject({});
    notificationsService.createNotification = originalCreate;
  });
});
