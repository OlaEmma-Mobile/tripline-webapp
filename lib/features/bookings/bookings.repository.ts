import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type {
  BookingRecord,
  DriverMarkBookingInput,
  DriverBookingRecord,
  BookingWithRideRecord,
  CreateBookingInput,
  CreateBookingResult,
  LockSeatInput,
  LockSeatResult,
} from './bookings.types';

interface LockSeatRpcRow {
  booking_id: string;
  trip_id: string;
  ride_instance_id: string;
  rider_id: string;
  status: BookingRecord['status'];
  seat_count: number;
  lock_expires_at: string | null;
  capacity: number;
  reserved_seats: number;
  available_seats: number;
}

interface CreateBookingRpcRow {
  booking_id: string;
  trip_id: string;
  ride_instance_id: string;
  rider_id: string;
  pickup_point_id: string;
  token_cost: number;
  status: BookingRecord['status'];
  seat_count: number;
  tokens_deducted: number;
  tokens_remaining: number;
  capacity: number;
  reserved_seats: number;
  available_seats: number;
}

/**
 * Booking persistence and RPC access.
 */
export class BookingsRepository {
  /**
   * Execute create_booking_with_tokens RPC in a single DB transaction.
   * @param input Booking payload.
   * @param riderId Rider user id.
   * @returns Created booking plus post-deduction token/availability snapshot.
   */
  async createBooking(input: CreateBookingInput, riderId: string): Promise<CreateBookingResult> {
    const { data, error } = await supabaseAdmin.rpc('create_booking_with_tokens', {
      p_trip_id: input.tripId,
      p_rider_id: riderId,
      p_pickup_point_id: input.pickupPointId,
      p_seat_count: input.seatCount,
    });

    if (error) {
      throw new AppError(error.message, 500);
    }

    const row = (Array.isArray(data) ? data[0] : data) as CreateBookingRpcRow | undefined;
    if (!row) {
      throw new AppError('Unable to create booking', 500);
    }

    return {
      bookingId: row.booking_id,
      tripId: row.trip_id,
      rideInstanceId: row.ride_instance_id,
      riderId: row.rider_id,
      pickupPointId: row.pickup_point_id,
      tokenCost: row.token_cost,
      status: row.status,
      seatCount: row.seat_count,
      tokensDeducted: row.tokens_deducted,
      tokensRemaining: row.tokens_remaining,
      capacity: row.capacity,
      reservedSeats: row.reserved_seats,
      availableSeats: row.available_seats,
    };
  }

  /**
   * Execute lock_seat RPC in Postgres transaction context.
   * @param input Seat lock payload.
   * @param riderId Rider user id.
   * @returns Lock result with updated availability snapshot.
   */
  async lockSeat(input: LockSeatInput, riderId: string): Promise<LockSeatResult> {
    const { data, error } = await supabaseAdmin.rpc('lock_seat', {
      p_trip_id: input.tripId,
      p_rider_id: riderId,
      p_seat_count: input.seatCount,
      p_lock_minutes: input.lockMinutes ?? 5,
    });

    if (error) {
      throw new AppError(error.message, 500);
    }

    const row = (Array.isArray(data) ? data[0] : data) as LockSeatRpcRow | undefined;
    if (!row) {
      throw new AppError('Unable to lock seat', 500);
    }

    return {
      bookingId: row.booking_id,
      tripId: row.trip_id,
      rideInstanceId: row.ride_instance_id,
      riderId: row.rider_id,
      status: row.status,
      seatCount: row.seat_count,
      lockExpiresAt: row.lock_expires_at,
      capacity: row.capacity,
      reservedSeats: row.reserved_seats,
      availableSeats: row.available_seats,
    };
  }

  /**
   * Execute confirm_booking RPC.
   * @param bookingId Booking id.
   * @param riderId Rider user id.
   * @returns Updated booking row.
   */
  async confirmBooking(bookingId: string, riderId: string): Promise<BookingRecord> {
    const { data, error } = await supabaseAdmin.rpc('confirm_booking', {
      p_booking_id: bookingId,
      p_rider_id: riderId,
    });

    if (error) {
      throw new AppError(error.message, 500);
    }

    const row = (Array.isArray(data) ? data[0] : data) as BookingRecord | undefined;
    if (!row) {
      throw new AppError('Unable to confirm booking', 500);
    }
    return row;
  }

  /**
   * Execute cancel_booking RPC.
   * @param bookingId Booking id.
   * @param actorUserId Rider user id.
   * @returns Updated booking row.
   */
  async cancelBooking(bookingId: string, actorUserId: string): Promise<BookingRecord> {
    const { data, error } = await supabaseAdmin.rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_actor_user_id: actorUserId,
    });

    if (error) {
      throw new AppError(error.message, 500);
    }

    const row = (Array.isArray(data) ? data[0] : data) as BookingRecord | undefined;
    if (!row) {
      throw new AppError('Unable to cancel booking', 500);
    }
    return row;
  }

  /**
   * List bookings for a rider with compact ride instance projection.
   * @param riderId Rider user id.
   * @returns Booking rows with embedded ride instance details.
   */
  async listByRider(riderId: string): Promise<BookingWithRideRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(
        'id, trip_id, ride_instance_id, rider_id, pickup_point_id, token_cost, status, seat_count, seat_number, lock_expires_at, confirmed_at, cancelled_at, boarded_at, no_show_marked_at, created_at, updated_at, trip:trips(id, trip_id, driver_trip_id, vehicle_id), ride_instance:ride_instances(route_id, vehicle_id, ride_date, departure_time, status), pickup_point:pickup_points(id, name, token_cost)'
      )
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })
      .returns<BookingWithRideRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch bookings', 500);
    }
    return data ?? [];
  }

  /**
   * Fetch a booking with minimal ride assignment details for driver authorization checks.
   * @param bookingId Booking id.
   * @returns Booking row with related ride assignment or null when not found.
   */
  async getBookingForDriver(bookingId: string): Promise<DriverBookingRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(
        'id, trip_id, ride_instance_id, rider_id, pickup_point_id, token_cost, status, seat_count, seat_number, lock_expires_at, confirmed_at, cancelled_at, boarded_at, no_show_marked_at, created_at, updated_at, trip:trips(id), ride_instance:ride_instances(id)'
      )
      .eq('id', bookingId)
      .maybeSingle<DriverBookingRecord>();

    if (error) {
      throw new AppError('Unable to fetch booking', 500);
    }

    return data ?? null;
  }

  /**
   * Update booking status during driver boarding operations.
   * @param bookingId Booking id.
   * @param status Target boarding status.
   * @returns Updated booking row.
   */
  async updateBoardingStatus(
    bookingId: string,
    status: 'boarded' | 'no_show'
  ): Promise<BookingRecord> {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select('*')
      .single<BookingRecord>();

    if (error || !data) {
      throw new AppError('Unable to update booking status', 500);
    }

    return data;
  }

  /**
   * Execute transactional driver finalization RPC (BOARDED/NO_SHOW).
   * @param input Driver booking action payload.
   * @returns Updated booking row with ride assignment projection.
   */
  async driverMarkBooking(input: DriverMarkBookingInput): Promise<DriverBookingRecord> {
    const { data, error } = await supabaseAdmin.rpc('driver_mark_booking', {
      p_booking_id: input.bookingId,
      p_driver_id: input.driverId,
      p_action: input.action,
      p_no_show_grace_minutes: 10,
    });

    if (error) {
      throw new AppError(error.message, 500);
    }

    const row = (Array.isArray(data) ? data[0] : data) as BookingRecord | undefined;
    if (!row) {
      throw new AppError('Unable to update booking status', 500);
    }

    return {
      ...row,
      trip: row.trip_id ? { id: row.trip_id } : null,
      ride_instance: {
        id: row.ride_instance_id,
      },
    };
  }
}

export const bookingsRepository = new BookingsRepository();
