import { describe, expect, it } from 'vitest';
import { RealtimeService } from './realtime.service';

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

    await service.updateRideStatus('ride-1', 'boarding');
    expect(writes[0]).toMatchObject({
      path: 'realtime/rides/ride-1/status',
      value: 'boarding',
    });
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
});
