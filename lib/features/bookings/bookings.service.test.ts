import { describe, expect, it } from 'vitest';
import { BookingsService } from './bookings.service';
import { AppError } from '@/lib/utils/errors';
import type { BookingRecord } from './bookings.types';

const baseBooking: BookingRecord = {
  id: 'booking-1',
  trip_id: 'trip-1',
  ride_instance_id: 'ride-1',
  rider_id: 'rider-1',
  pickup_point_id: null,
  pickup_point_latitude: null,
  pickup_point_longitude: null,
  token_cost: 0,
  status: 'booked',
  seat_count: 1,
  seat_number: null,
  lock_expires_at: null,
  confirmed_at: null,
  cancelled_at: null,
  boarded_at: null,
  no_show_marked_at: null,
  boarding_status: 'none',
  boarding_requested_at: null,
  boarding_expires_at: null,
  boarding_requested_by_driver_id: null,
  boarding_approved_at: null,
  boarding_declined_at: null,
  boarding_decline_reason: null,
  boarding_verified_at: null,
  boarding_verification_method: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function createService(handler: (payload: {
  bookingId: string;
  driverId: string;
  action: 'boarded' | 'no_show';
}) => Promise<BookingRecord>): BookingsService {
  const repo = {
    driverMarkBooking: handler,
  } as unknown as ConstructorParameters<typeof BookingsService>[0];
  return new BookingsService(repo);
}

describe('BookingsService.markDriverBoarding', () => {
  it('marks BOOKED booking as NO_SHOW', async () => {
    const service = createService(async () => ({
      ...baseBooking,
      status: 'no_show',
      no_show_marked_at: new Date().toISOString(),
    }));

    const result = await service.markDriverBoarding('booking-1', 'driver-1', 'NO_SHOW');
    expect(result.status).toBe('no_show');
    expect(result.noShowMarkedAt).toBeTruthy();
  });

  it('rejects NO_SHOW before departure grace period', async () => {
    const service = createService(async () => {
      throw new AppError('NO_SHOW_TOO_EARLY', 500);
    });

    await expect(service.markDriverBoarding('booking-1', 'driver-1', 'NO_SHOW')).rejects.toMatchObject({
      message: 'NO_SHOW cannot be marked before departure grace period',
      status: 422,
    });
  });

  it('rejects boarded updates and requires the verification flow', async () => {
    const service = createService(async () => baseBooking);

    await expect(service.markDriverBoarding('booking-1', 'driver-1', 'BOARDED')).rejects.toMatchObject({
      message: 'Use boarding request or passcode verification to mark boarded',
      status: 409,
    });
  });

  it('rejects double marking / non-BOOKED status for no-show', async () => {
    const service = createService(async () => {
      throw new AppError('BOOKING_NOT_BOOKED', 500);
    });

    await expect(service.markDriverBoarding('booking-1', 'driver-1', 'NO_SHOW')).rejects.toMatchObject({
      message: 'Only BOOKED bookings can be marked for boarding',
      status: 409,
    });
  });

  it('rejects cancelled booking updates as not-booked conflict', async () => {
    const service = createService(async () => {
      throw new AppError('BOOKING_NOT_BOOKED', 500);
    });

    await expect(service.markDriverBoarding('booking-1', 'driver-1', 'NO_SHOW')).rejects.toMatchObject({
      status: 409,
    });
  });

  it('rejects unauthorized driver attempts', async () => {
    const service = createService(async () => {
      throw new AppError('FORBIDDEN_DRIVER', 500);
    });

    await expect(service.markDriverBoarding('booking-1', 'driver-2', 'NO_SHOW')).rejects.toMatchObject({
      message: 'Forbidden',
      status: 403,
    });
  });

  it('returns not found when booking does not exist', async () => {
    const service = createService(async () => {
      throw new AppError('BOOKING_NOT_FOUND', 500);
    });

    await expect(service.markDriverBoarding('booking-missing', 'driver-1', 'NO_SHOW')).rejects.toMatchObject({
      message: 'Booking not found',
      status: 404,
    });
  });

  it('rejects invalid action payload', async () => {
    const service = createService(async () => baseBooking);

    await expect(
      service.markDriverBoarding('booking-1', 'driver-1', 'INVALID_ACTION')
    ).rejects.toMatchObject({
      message: 'Invalid boarding status',
      status: 400,
    });
  });
});
