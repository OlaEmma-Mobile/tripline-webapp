import { AppError } from '@/lib/utils/errors';
import {
  normalizeBoardingStatus,
} from '@/lib/features/drivers/driver-booking-auth';
import { logStep } from '@/lib/utils/logger';
import { realtimeService } from '@/lib/features/realtime/realtime.service';
import { bookingsRepository, BookingsRepository } from './bookings.repository';
import type {
  BookingDTO,
  BookingRecord,
  BookingWithRideRecord,
  CreateBookingInput,
  CreateBookingResult,
  DriverBookingRecord,
  LockSeatInput,
  LockSeatResult,
} from './bookings.types';

/**
 * mapBooking Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapBooking(record: BookingRecord): BookingDTO {
  return {
    id: record.id,
    rideInstanceId: record.ride_instance_id,
    riderId: record.rider_id,
    status: record.status,
    seatCount: record.seat_count,
    seatNumber: record.seat_number,
    lockExpiresAt: record.lock_expires_at,
    confirmedAt: record.confirmed_at,
    cancelledAt: record.cancelled_at,
    boardedAt: record.boarded_at,
    noShowMarkedAt: record.no_show_marked_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * mapBookingWithRide Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapBookingWithRide(record: BookingWithRideRecord): BookingDTO & {
  rideInstance: BookingWithRideRecord['ride_instance'];
} {
  return {
    ...mapBooking(record),
    rideInstance: record.ride_instance,
  };
}

/**
 * mapDriverBooking Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapDriverBooking(record: DriverBookingRecord): BookingDTO & {
  rideInstance: DriverBookingRecord['ride_instance'];
} {
  return {
    ...mapBooking(record),
    rideInstance: record.ride_instance,
  };
}

/**
 * Booking service with domain error mapping.
 */
export class BookingsService {
  constructor(private readonly repo: BookingsRepository) {}

  /**
   * Maps low-level RPC/SQL errors to domain-friendly AppError values.
   * @param error Base repository error.
   * @throws AppError
   */
  private mapRpcError(error: AppError): never {
    const message = (error.message || '').toUpperCase();
    if (message.includes('NO_SEATS_AVAILABLE')) {
      throw new AppError('No seats available', 409);
    }
    if (message.includes('LOCK_EXPIRED')) {
      throw new AppError('Seat lock has expired', 409);
    }
    if (message.includes('BOOKING_NOT_FOUND')) {
      throw new AppError('Booking not found', 404);
    }
    if (message.includes('RIDE_INSTANCE_NOT_FOUND')) {
      throw new AppError('Ride instance not found', 404);
    }
    if (message.includes('BOOKING_ALREADY_CONFIRMED')) {
      throw new AppError('Booking already confirmed', 409);
    }
    if (message.includes('FORBIDDEN_CANCEL')) {
      throw new AppError('You cannot cancel this booking', 403);
    }
    if (message.includes('BOOKING_NOT_CONFIRMABLE')) {
      throw new AppError('Booking cannot be confirmed', 409);
    }
    if (message.includes('INVALID_SEAT_COUNT')) {
      throw new AppError('Seat count is invalid', 400);
    }
    if (message.includes('INSUFFICIENT_TOKENS')) {
      throw new AppError('Insufficient tokens', 409);
    }
    if (message.includes('RIDE_NOT_BOOKABLE')) {
      throw new AppError('Ride is not open for booking', 409);
    }
    if (message.includes('ROUTE_NOT_FOUND')) {
      throw new AppError('Route not found', 404);
    }
    throw error;
  }

  /**
   * Create a booked booking and deduct tokens atomically.
   * @param input Booking payload.
   * @param riderId Rider user id.
   * @returns Booking + token deduction result.
   */
  async createBooking(input: CreateBookingInput, riderId: string): Promise<CreateBookingResult> {
    try {
      return await this.repo.createBooking(input, riderId);
    } catch (error) {
      if (error instanceof AppError) this.mapRpcError(error);
      throw error;
    }
  }

  /**
   * Lock seats for a rider on a ride instance.
   * @param input Lock payload.
   * @param riderId Rider user id.
   * @returns Booking lock result including remaining seats.
   */
  async lockSeat(input: LockSeatInput, riderId: string): Promise<LockSeatResult> {
    try {
      return await this.repo.lockSeat(input, riderId);
    } catch (error) {
      if (error instanceof AppError) this.mapRpcError(error);
      throw error;
    }
  }

  /**
   * Confirm a previously locked booking.
   * @param bookingId Booking id.
   * @param riderId Rider user id.
   * @returns Confirmed booking DTO.
   */
  async confirmBooking(bookingId: string, riderId: string): Promise<BookingDTO> {
    try {
      const booking = await this.repo.confirmBooking(bookingId, riderId);
      return mapBooking(booking);
    } catch (error) {
      if (error instanceof AppError) this.mapRpcError(error);
      throw error;
    }
  }

  /**
   * Cancel a rider booking.
   * @param bookingId Booking id.
   * @param actorUserId Rider user id.
   * @returns Cancelled booking DTO.
   */
  async cancelBooking(bookingId: string, actorUserId: string): Promise<BookingDTO> {
    try {
      const booking = await this.repo.cancelBooking(bookingId, actorUserId);
      const mapped = mapBooking(booking);
      if (mapped.status === 'cancelled') {
        try {
          await realtimeService.notifyBookingStatusChange({
            userId: mapped.riderId,
            bookingId: mapped.id,
            status: 'cancelled',
          });
        } catch {
          logStep('realtime notification sync failed', {
            bookingId: mapped.id,
            status: 'cancelled',
          });
        }
      }
      return mapped;
    } catch (error) {
      if (error instanceof AppError) this.mapRpcError(error);
      throw error;
    }
  }

  /**
   * List current rider bookings.
   * @param riderId Rider user id.
   * @returns Rider bookings with minimal ride instance details.
   */
  async listMyBookings(riderId: string): Promise<Array<BookingDTO & { rideInstance: BookingWithRideRecord['ride_instance'] }>> {
    const rows = await this.repo.listByRider(riderId);
    return rows.map(mapBookingWithRide);
  }

  /**
   * Mark a booking as boarded/no-show by an assigned driver.
   * @param bookingId Booking id.
   * @param driverId Authenticated driver user id.
   * @param statusInput Incoming raw status payload.
   * @returns Updated booking DTO with ride assignment context.
   */
  async markDriverBoarding(
    bookingId: string,
    driverId: string,
    actionInput: string
  ): Promise<BookingDTO & { rideInstance: DriverBookingRecord['ride_instance'] }> {
    const action = normalizeBoardingStatus(actionInput);
    try {
      const updated = await this.repo.driverMarkBooking({
        bookingId,
        driverId,
        action,
      });
      const mapped = mapDriverBooking(updated);
      if (mapped.status === 'boarded' || mapped.status === 'no_show') {
        try {
          await realtimeService.notifyBookingStatusChange({
            userId: mapped.riderId,
            bookingId: mapped.id,
            status: mapped.status,
          });
        } catch {
          logStep('realtime notification sync failed', {
            bookingId: mapped.id,
            status: mapped.status,
          });
        }
      }
      return mapped;
    } catch (error) {
      if (error instanceof AppError) {
        const message = (error.message || '').toUpperCase();
        if (message.includes('BOOKING_NOT_FOUND')) throw new AppError('Booking not found', 404);
        if (message.includes('FORBIDDEN_DRIVER')) throw new AppError('Forbidden', 403);
        if (message.includes('RIDE_CLOSED')) throw new AppError('Ride is already closed', 409);
        if (message.includes('BOOKING_NOT_BOOKED')) {
          throw new AppError('Only BOOKED bookings can be marked for boarding', 409);
        }
        if (message.includes('NO_SHOW_TOO_EARLY')) {
          throw new AppError('NO_SHOW cannot be marked before departure grace period', 422);
        }
        if (message.includes('INVALID_ACTION')) throw new AppError('Invalid boarding status', 400);
      }
      throw error;
    }
  }
}

export const bookingsService = new BookingsService(bookingsRepository);
