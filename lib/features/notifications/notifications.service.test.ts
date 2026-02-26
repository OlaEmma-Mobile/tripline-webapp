import { describe, expect, it } from 'vitest';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('returns created=true for first insert', async () => {
    const service = new NotificationsService({
      create: async () => ({ id: 'n-1', created: true }),
    } as never);

    const result = await service.createNotification({
      userId: 'user-1',
      type: 'booking_status',
      message: 'hello',
      reference: 'booking-1',
      reason: 'RIDE_BOARDED',
    });

    expect(result).toMatchObject({ id: 'n-1', created: true });
  });

  it('returns created=false for idempotent duplicate', async () => {
    const service = new NotificationsService({
      create: async () => ({ id: 'n-1', created: false }),
    } as never);

    const result = await service.createNotification({
      userId: 'user-1',
      type: 'booking_status',
      message: 'hello',
      reference: 'booking-1',
      reason: 'RIDE_BOARDED',
    });

    expect(result).toMatchObject({ id: 'n-1', created: false });
  });
});
