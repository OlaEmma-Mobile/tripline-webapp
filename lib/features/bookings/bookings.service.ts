import { AppError } from '@/lib/utils/errors';
import { verifyRidePasscode } from '@/lib/security/passcode';
import {
  normalizeBoardingStatus,
} from '@/lib/features/drivers/driver-booking-auth';
import { logStep } from '@/lib/utils/logger';
import { realtimeService } from '@/lib/features/realtime/realtime.service';
import { rideInstancesRepository } from '@/lib/features/ride-instances/ride-instances.repository';
import { assignmentsRepository } from '@/lib/features/assignments/assignments.repository';
import { usersRepository } from '@/lib/features/users/users.repository';
import { bookingsRepository, BookingsRepository } from './bookings.repository';
import { z } from 'zod';
import type {
  BoardingContextRecord,
  BookingDTO,
  BookingRecord,
  BookingWithRideRecord,
  CreateBookingInput,
  CreateBookingResult,
  DriverBookingRecord,
  LockSeatInput,
  LockSeatResult,
  RequestBoardingInput,
  RespondBoardingInput,
  VerifyBoardingPasscodeInput,
} from './bookings.types';

type ValidatedBoardingContext = BoardingContextRecord & {
  trip: NonNullable<BoardingContextRecord['trip']>;
};

/**
 * mapBooking Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapBooking(record: BookingRecord): BookingDTO {
  return {
    id: record.id,
    tripId: record.trip_id,
    rideInstanceId: record.ride_instance_id,
    riderId: record.rider_id,
    pickupPointId: record.pickup_point_id,
    pickupPointLatitude: record.pickup_point_latitude,
    pickupPointLongitude: record.pickup_point_longitude,
    tokenCost: record.token_cost,
    status: record.status,
    seatCount: record.seat_count,
    seatNumber: record.seat_number,
    lockExpiresAt: record.lock_expires_at,
    confirmedAt: record.confirmed_at,
    cancelledAt: record.cancelled_at,
    boardedAt: record.boarded_at,
    noShowMarkedAt: record.no_show_marked_at,
    boardingStatus: record.boarding_status,
    boardingRequestedAt: record.boarding_requested_at,
    boardingExpiresAt: record.boarding_expires_at,
    boardingRequestedByDriverId: record.boarding_requested_by_driver_id,
    boardingApprovedAt: record.boarding_approved_at,
    boardingDeclinedAt: record.boarding_declined_at,
    boardingDeclineReason: record.boarding_decline_reason,
    boardingVerifiedAt: record.boarding_verified_at,
    boardingVerificationMethod: record.boarding_verification_method,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * mapBookingWithRide Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapBookingWithRide(record: BookingWithRideRecord): BookingDTO & {
  trip: BookingWithRideRecord['trip'];
  rideInstance: BookingWithRideRecord['ride_instance'];
} {
  return {
    ...mapBooking(record),
    pickupPointName: record.pickup_point?.name ?? null,
    trip: record.trip,
    rideInstance: record.ride_instance,
  };
}

/**
 * mapDriverBooking Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapDriverBooking(record: DriverBookingRecord): BookingDTO & {
  trip: DriverBookingRecord['trip'];
  rideInstance: DriverBookingRecord['ride_instance'];
} {
  return {
    ...mapBooking(record),
    trip: record.trip,
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
    if (message.includes('TRIP_NOT_FOUND')) {
      throw new AppError('Trip not found', 404);
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
    if (message.includes('RIDE_NOT_READY')) {
      throw new AppError('Ride is not ready for booking yet', 409);
    }
    if (message.includes('PICKUP_POINT_REQUIRED')) {
      throw new AppError('Pickup point is required', 400);
    }
    if (message.includes('PICKUP_POINT_NOT_FOUND')) {
      throw new AppError('Pickup point not found for this route', 404);
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
   * Lock seats for a rider on a trip.
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
        } catch (error) {
          if (error instanceof AppError && error.message.includes('Unable to create notification')) {
            throw error;
          }
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
   * @returns Rider bookings with trip and ride details.
   */
  async listMyBookings(
    riderId: string
  ): Promise<Array<BookingDTO & { trip: BookingWithRideRecord['trip']; rideInstance: BookingWithRideRecord['ride_instance'] }>> {
    const rows = await this.repo.listByRider(riderId);
    return rows.map(mapBookingWithRide);
  }

  private async notifyBoardingEvent(input: {
    userId: string;
    bookingId: string;
    type: string;
    title: string;
    message: string;
    reference: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await realtimeService.notifyUserEvent(input);
    } catch (error) {
      if (error instanceof AppError && error.message.includes('Unable to create notification')) {
        throw error;
      }
      logStep('boarding notification sync failed', {
        bookingId: input.bookingId,
        reason: input.reason,
      });
    }
  }

  private async getValidatedBoardingContext(bookingId: string): Promise<ValidatedBoardingContext> {
    const booking = await this.repo.getBoardingContext(bookingId);
    if (!booking || !booking.trip) {
      throw new AppError('Booking not found', 404);
    }
    if (booking.status !== 'booked') {
      throw new AppError('Only BOOKED bookings can enter boarding verification', 409);
    }
    if (booking.trip.status !== 'ongoing') {
      throw new AppError('Trip must be started before boarding updates', 409);
    }
    return booking as ValidatedBoardingContext;
  }

  private async expireBoardingIfNeeded(bookingId: string, expiresAt: string | null, status: string): Promise<void> {
    if (status !== 'requested' || !expiresAt) return;
    if (new Date(expiresAt) > new Date()) return;
    await this.repo.expireBoardingRequest(bookingId);
  }

  /** Driver requests rider boarding confirmation. */
  async requestBoarding(input: RequestBoardingInput): Promise<BookingDTO> {
    const booking = await this.getValidatedBoardingContext(input.bookingId);
    if (booking.trip.id !== input.tripId) {
      throw new AppError('Booking does not belong to this trip', 400);
    }
    if (booking.trip.driver_id !== input.driverId) {
      throw new AppError('Forbidden', 403);
    }

    await this.expireBoardingIfNeeded(booking.id, booking.boarding_expires_at, booking.boarding_status);
    if (booking.boarding_status === 'requested' && booking.boarding_expires_at && new Date(booking.boarding_expires_at) > new Date()) {
      throw new AppError('An active boarding request already exists', 409);
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const updated = await this.repo.requestBoarding(booking.id, input.driverId, expiresAt);
    const mapped = mapBooking(updated);
    await this.notifyBoardingEvent({
      userId: mapped.riderId,
      bookingId: mapped.id,
      type: 'boarding_request',
      title: 'Boarding approval requested',
      message: 'Your driver requested boarding confirmation for this trip.',
      reference: mapped.id,
      reason: 'BOARDING_REQUESTED',
      metadata: {
        tripId: input.tripId,
        bookingId: mapped.id,
        expiresAt,
      },
    });
    return mapped;
  }

  /** Rider approves or declines a pending boarding request. */
  async respondToBoarding(input: RespondBoardingInput): Promise<BookingDTO> {
    const booking = await this.getValidatedBoardingContext(input.bookingId);
    if (booking.rider_id !== input.riderId) {
      throw new AppError('Forbidden', 403);
    }

    await this.expireBoardingIfNeeded(booking.id, booking.boarding_expires_at, booking.boarding_status);
    const refreshed = await this.repo.getBoardingContext(booking.id);
    if (!refreshed || !refreshed.trip) throw new AppError('Booking not found', 404);
    if (!refreshed.trip.driver_id) {
      throw new AppError('Trip is awaiting driver reassignment', 409);
    }
    if (refreshed.boarding_status !== 'requested') {
      throw new AppError('There is no active boarding request for this booking', 409);
    }

    if (input.decision === 'decline') {
      const declined = await this.repo.declineBoarding(booking.id, input.declineReason);
      const mapped = mapBooking(declined);
      await this.notifyBoardingEvent({
        userId: refreshed.trip.driver_id,
        bookingId: mapped.id,
        type: 'boarding_status',
        title: 'Boarding declined',
        message: 'The rider declined the boarding request.',
        reference: mapped.id,
        reason: 'BOARDING_DECLINED',
        metadata: {
          tripId: refreshed.trip.id,
          bookingId: mapped.id,
        },
      });
      return mapped;
    }

    const rider = await usersRepository.getById(input.riderId);
    if (!rider?.ride_passcode_hash) {
      throw new AppError('Ride passcode is not set', 409);
    }
    const valid = await verifyRidePasscode(rider.ride_passcode_hash, input.passcode ?? '');
    if (!valid) {
      throw new AppError('Ride passcode is incorrect', 401);
    }

    const approved = await this.repo.approveBoarding(booking.id, {
      status: 'approved',
      method: 'rider_approved',
    });
    const mapped = mapBooking(approved);
    await this.notifyBoardingEvent({
      userId: refreshed.trip.driver_id,
      bookingId: mapped.id,
      type: 'boarding_status',
      title: 'Boarding approved',
      message: 'The rider approved boarding.',
      reference: mapped.id,
      reason: 'BOARDING_APPROVED',
      metadata: {
        tripId: refreshed.trip.id,
        bookingId: mapped.id,
      },
    });
    return mapped;
  }

  /** Driver verifies rider passcode to finalize boarding in person. */
  async verifyBoardingPasscode(input: VerifyBoardingPasscodeInput): Promise<BookingDTO> {
    const booking = await this.getValidatedBoardingContext(input.bookingId);
    if (booking.trip.id !== input.tripId) {
      throw new AppError('Booking does not belong to this trip', 400);
    }
    if (booking.trip.driver_id !== input.driverId) {
      throw new AppError('Forbidden', 403);
    }

    await this.expireBoardingIfNeeded(booking.id, booking.boarding_expires_at, booking.boarding_status);
    const refreshed = await this.repo.getBoardingContext(booking.id);
    if (!refreshed || !refreshed.trip) throw new AppError('Booking not found', 404);
    if (!refreshed.trip.driver_id) {
      throw new AppError('Trip is awaiting driver reassignment', 409);
    }
    if (refreshed.boarding_status !== 'requested') {
      throw new AppError('There is no active boarding request for this booking', 409);
    }

    const rider = await usersRepository.getById(refreshed.rider_id);
    if (!rider?.ride_passcode_hash) {
      throw new AppError('Rider has not set a ride passcode', 409);
    }
    const valid = await verifyRidePasscode(rider.ride_passcode_hash, input.passcode);
    if (!valid) {
      throw new AppError('Ride passcode is incorrect', 401);
    }

    const approved = await this.repo.approveBoarding(booking.id, {
      status: 'passcode_verified',
      method: 'driver_verified_passcode',
    });
    const mapped = mapBooking(approved);
    await this.notifyBoardingEvent({
      userId: refreshed.rider_id,
      bookingId: mapped.id,
      type: 'boarding_status',
      title: 'Boarding verified',
      message: 'Your driver verified your passcode and confirmed boarding.',
      reference: mapped.id,
      reason: 'BOARDING_PASSCODE_VERIFIED',
      metadata: {
        tripId: refreshed.trip.id,
        bookingId: mapped.id,
      },
    });
    return mapped;
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
    if (action === 'boarded') {
      throw new AppError('Use boarding request or passcode verification to mark boarded', 409);
    }
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
        } catch (error) {
          if (error instanceof AppError && error.message.includes('Unable to create notification')) {
            throw error;
          }
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
        if (message.includes('TRIP_NOT_STARTED')) {
          throw new AppError('Trip must be started before boarding updates', 409);
        }
        if (message.includes('NO_SHOW_TOO_EARLY')) {
          throw new AppError('NO_SHOW cannot be marked before departure grace period', 422);
        }
        if (message.includes('INVALID_ACTION')) throw new AppError('Invalid boarding status', 400);
      }
      throw error;
    }
  }

  /**
   * Batch update passenger boarding statuses for a ride instance.
   * @param rideInstanceId Ride instance id.
   * @param driverId Authenticated driver user id.
   * @param updates List of bookingId/status updates.
   */
  async markDriverBoardingBatch(
    rideInstanceId: string,
    driverId: string,
    updates: Array<{ bookingId: string; status: string }>
  ): Promise<Array<BookingDTO & { rideInstance: DriverBookingRecord['ride_instance'] }>> {
    const ride = await rideInstancesRepository.getById(rideInstanceId);
    if (!ride) {
      throw new AppError('Ride instance not found', 404);
    }
    const isAssigned = await assignmentsRepository.isDriverAssignedToRide(rideInstanceId, driverId);
    if (!isAssigned) {
      throw new AppError('Forbidden', 403);
    }

    const results: Array<BookingDTO & { rideInstance: DriverBookingRecord['ride_instance'] }> = [];
    for (const update of updates) {
      const booking = await this.repo.getBookingForDriver(update.bookingId);
      if (!booking) {
        throw new AppError('Booking not found', 404);
      }
      if (booking.ride_instance_id !== rideInstanceId) {
        throw new AppError('Booking does not belong to this ride instance', 400);
      }
      const updated = await this.markDriverBoarding(update.bookingId, driverId, update.status);
      results.push(updated);
    }

    return results;
  }
}

export const bookingsService = new BookingsService(bookingsRepository);
