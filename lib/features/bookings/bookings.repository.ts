import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type {
  BoardingContextRecord,
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
  pickup_point_latitude: number | null;
  pickup_point_longitude: number | null;
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
  private isMissingBookingReadSchema(
    error: { message?: string; details?: string; hint?: string; code?: string } | null
  ): boolean {
    if (!error) return false;
    const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
    return (
      error.code === '42703' ||
      text.includes('pickup_point_latitude') ||
      text.includes('pickup_point_longitude') ||
      text.includes('boarding_status') ||
      text.includes('boarding_requested_at') ||
      text.includes('boarding_expires_at') ||
      text.includes('boarding_requested_by_driver_id') ||
      text.includes('boarding_approved_at') ||
      text.includes('boarding_declined_at') ||
      text.includes('boarding_decline_reason') ||
      text.includes('boarding_verified_at') ||
      text.includes('boarding_verification_method')
    );
  }

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
      pickupPointLatitude: row.pickup_point_latitude,
      pickupPointLongitude: row.pickup_point_longitude,
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
    let { data, error } = await supabaseAdmin
      .from('bookings')
      .select(
        'id, trip_id, ride_instance_id, rider_id, pickup_point_id, pickup_point_latitude, pickup_point_longitude, token_cost, status, seat_count, seat_number, lock_expires_at, confirmed_at, cancelled_at, boarded_at, no_show_marked_at, boarding_status, boarding_requested_at, boarding_expires_at, boarding_requested_by_driver_id, boarding_approved_at, boarding_declined_at, boarding_decline_reason, boarding_verified_at, boarding_verification_method, created_at, updated_at, trip:trips(id, trip_id, driver_trip_id, vehicle_id), ride_instance:ride_instances(route_id, vehicle_id, ride_date, departure_time, status), pickup_point:pickup_points(id, name, token_cost)'
      )
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })
      .returns<BookingWithRideRecord[]>();

    if (this.isMissingBookingReadSchema(error)) {
      const fallback = await supabaseAdmin
        .from('bookings')
        .select(
          'id, trip_id, ride_instance_id, rider_id, pickup_point_id, token_cost, status, seat_count, seat_number, lock_expires_at, confirmed_at, cancelled_at, boarded_at, no_show_marked_at, created_at, updated_at, trip:trips(id, trip_id, driver_trip_id, vehicle_id), ride_instance:ride_instances(route_id, vehicle_id, ride_date, departure_time, status), pickup_point:pickup_points(id, name, token_cost)'
        )
        .eq('rider_id', riderId)
        .order('created_at', { ascending: false })
        .returns<any[]>();
      error = fallback.error;
      data = (fallback.data ?? []).map((row) => ({
        ...row,
        pickup_point_latitude: null,
        pickup_point_longitude: null,
        boarding_status: 'none',
        boarding_requested_at: null,
        boarding_expires_at: null,
        boarding_requested_by_driver_id: null,
        boarding_approved_at: null,
        boarding_declined_at: null,
        boarding_decline_reason: null,
        boarding_verified_at: null,
        boarding_verification_method: null,
      })) as BookingWithRideRecord[];
    }

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
    let { data, error } = await supabaseAdmin
      .from('bookings')
      .select(
        'id, trip_id, ride_instance_id, rider_id, pickup_point_id, pickup_point_latitude, pickup_point_longitude, token_cost, status, seat_count, seat_number, lock_expires_at, confirmed_at, cancelled_at, boarded_at, no_show_marked_at, boarding_status, boarding_requested_at, boarding_expires_at, boarding_requested_by_driver_id, boarding_approved_at, boarding_declined_at, boarding_decline_reason, boarding_verified_at, boarding_verification_method, created_at, updated_at, trip:trips(id), ride_instance:ride_instances(id)'
      )
      .eq('id', bookingId)
      .maybeSingle<DriverBookingRecord>();

    if (this.isMissingBookingReadSchema(error)) {
      const fallback = await supabaseAdmin
        .from('bookings')
        .select(
          'id, trip_id, ride_instance_id, rider_id, pickup_point_id, token_cost, status, seat_count, seat_number, lock_expires_at, confirmed_at, cancelled_at, boarded_at, no_show_marked_at, created_at, updated_at, trip:trips(id), ride_instance:ride_instances(id)'
        )
        .eq('id', bookingId)
        .maybeSingle<any>();
      error = fallback.error;
      data = fallback.data
        ? {
            ...fallback.data,
            pickup_point_latitude: null,
            pickup_point_longitude: null,
            boarding_status: 'none',
            boarding_requested_at: null,
            boarding_expires_at: null,
            boarding_requested_by_driver_id: null,
            boarding_approved_at: null,
            boarding_declined_at: null,
            boarding_decline_reason: null,
            boarding_verified_at: null,
            boarding_verification_method: null,
          }
        : null;
    }

    if (error) {
      throw new AppError('Unable to fetch booking', 500);
    }

    return data ?? null;
  }

  /**
   * Fetch a booking with trip ownership + boarding verification context.
   */
  async getBoardingContext(bookingId: string): Promise<BoardingContextRecord | null> {
    let { data, error } = await supabaseAdmin
      .from('bookings')
      .select(
        'id, trip_id, ride_instance_id, rider_id, pickup_point_id, pickup_point_latitude, pickup_point_longitude, token_cost, status, seat_count, seat_number, lock_expires_at, confirmed_at, cancelled_at, boarded_at, no_show_marked_at, boarding_status, boarding_requested_at, boarding_expires_at, boarding_requested_by_driver_id, boarding_approved_at, boarding_declined_at, boarding_decline_reason, boarding_verified_at, boarding_verification_method, created_at, updated_at, trip:trips(id, driver_id, status)'
      )
      .eq('id', bookingId)
      .maybeSingle<BoardingContextRecord>();

    if (this.isMissingBookingReadSchema(error)) {
      const fallback = await supabaseAdmin
        .from('bookings')
        .select(
          'id, trip_id, ride_instance_id, rider_id, pickup_point_id, token_cost, status, seat_count, seat_number, lock_expires_at, confirmed_at, cancelled_at, boarded_at, no_show_marked_at, created_at, updated_at, trip:trips(id, driver_id, status)'
        )
        .eq('id', bookingId)
        .maybeSingle<any>();
      error = fallback.error;
      data = fallback.data
        ? {
            ...fallback.data,
            pickup_point_latitude: null,
            pickup_point_longitude: null,
            boarding_status: 'none',
            boarding_requested_at: null,
            boarding_expires_at: null,
            boarding_requested_by_driver_id: null,
            boarding_approved_at: null,
            boarding_declined_at: null,
            boarding_decline_reason: null,
            boarding_verified_at: null,
            boarding_verification_method: null,
          }
        : null;
    }

    if (error) {
      throw new AppError('Unable to fetch booking boarding context', 500);
    }

    return data ?? null;
  }

  /**
   * Create or refresh an active boarding request.
   */
  async requestBoarding(bookingId: string, driverId: string, expiresAt: string): Promise<BookingRecord> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({
        boarding_status: 'requested',
        boarding_requested_at: now,
        boarding_expires_at: expiresAt,
        boarding_requested_by_driver_id: driverId,
        boarding_approved_at: null,
        boarding_declined_at: null,
        boarding_decline_reason: null,
        boarding_verified_at: null,
        boarding_verification_method: null,
      })
      .eq('id', bookingId)
      .select('*')
      .single<BookingRecord>();

    if (error || !data) {
      throw new AppError('Unable to request boarding verification', 500);
    }

    return data;
  }

  /**
   * Expire an active boarding request.
   */
  async expireBoardingRequest(bookingId: string): Promise<BookingRecord> {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({
        boarding_status: 'expired',
        boarding_expires_at: null,
      })
      .eq('id', bookingId)
      .select('*')
      .single<BookingRecord>();

    if (error || !data) {
      throw new AppError('Unable to expire boarding request', 500);
    }

    return data;
  }

  /**
   * Finalize boarded booking after rider approval or passcode verification.
   */
  async approveBoarding(
    bookingId: string,
    input: { status: 'approved' | 'passcode_verified'; method: 'rider_approved' | 'driver_verified_passcode' }
  ): Promise<BookingRecord> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'boarded',
        boarded_at: now,
        boarding_status: input.status,
        boarding_approved_at: input.method === 'rider_approved' ? now : null,
        boarding_verified_at: now,
        boarding_verification_method: input.method,
        boarding_expires_at: null,
      })
      .eq('id', bookingId)
      .select('*')
      .single<BookingRecord>();

    if (error || !data) {
      throw new AppError('Unable to approve boarding', 500);
    }

    return data;
  }

  /**
   * Decline a pending boarding request while keeping booking active.
   */
  async declineBoarding(bookingId: string, declineReason?: string): Promise<BookingRecord> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({
        boarding_status: 'declined',
        boarding_declined_at: now,
        boarding_decline_reason: declineReason ?? null,
        boarding_expires_at: null,
      })
      .eq('id', bookingId)
      .select('*')
      .single<BookingRecord>();

    if (error || !data) {
      throw new AppError('Unable to decline boarding request', 500);
    }

    return data;
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
