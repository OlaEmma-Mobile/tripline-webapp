export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'booked'
  | 'boarded'
  | 'no_show'
  | 'completed'
  | 'cancelled'
  | 'expired';

/**
 * Raw booking row from Postgres.
 */
export interface BookingRecord {
  /** Primary key. */
  id: string;
  /** Linked ride instance id. */
  ride_instance_id: string;
  /** Linked rider user id. */
  rider_id: string;
  /** Booking state. */
  status: BookingStatus;
  /** Number of seats reserved by this booking. */
  seat_count: number;
  /** Optional seat number (not enforced in V1). */
  seat_number: number | null;
  /** Expiry time for pending lock. */
  lock_expires_at: string | null;
  /** Time booking was confirmed. */
  confirmed_at: string | null;
  /** Time booking was cancelled. */
  cancelled_at: string | null;
  /** Time rider was marked boarded by driver. */
  boarded_at: string | null;
  /** Time rider was marked no-show by driver. */
  no_show_marked_at: string | null;
  /** Creation timestamp. */
  created_at: string;
  /** Last update timestamp. */
  updated_at: string;
}

/**
 * API-safe camelCase booking shape exposed to clients.
 */
export interface BookingDTO {
  /** Primary key. */
  id: string;
  /** Ride instance id. */
  rideInstanceId: string;
  /** Rider user id. */
  riderId: string;
  /** Booking state. */
  status: BookingStatus;
  /** Number of seats reserved. */
  seatCount: number;
  /** Optional seat number. */
  seatNumber: number | null;
  /** Lock expiry for pending bookings. */
  lockExpiresAt: string | null;
  /** Confirmation timestamp. */
  confirmedAt: string | null;
  /** Cancellation timestamp. */
  cancelledAt: string | null;
  /** Boarding timestamp. */
  boardedAt: string | null;
  /** No-show timestamp. */
  noShowMarkedAt: string | null;
  /** Creation timestamp. */
  createdAt: string;
  /** Last update timestamp. */
  updatedAt: string;
}

/**
 * Input for seat lock request.
 */
export interface LockSeatInput {
  /** Target ride instance id. */
  rideInstanceId: string;
  /** Number of seats to reserve. */
  seatCount: number;
  /** Optional lock lifetime in minutes; defaults at RPC level. */
  lockMinutes?: number;
}

/**
 * Input for direct booking with atomic token deduction.
 */
export interface CreateBookingInput {
  /** Target ride instance id. */
  rideInstanceId: string;
  /** Number of seats to book. */
  seatCount: number;
}

/**
 * RPC result for direct booking + token deduction transaction.
 */
export interface CreateBookingResult {
  /** Created booking id. */
  bookingId: string;
  /** Ride instance id. */
  rideInstanceId: string;
  /** Rider id. */
  riderId: string;
  /** Booking status, expected `booked`. */
  status: BookingStatus;
  /** Number of seats booked. */
  seatCount: number;
  /** Tokens deducted in this booking transaction. */
  tokensDeducted: number;
  /** Rider token balance after deduction. */
  tokensRemaining: number;
  /** Vehicle capacity for the ride instance. */
  capacity: number;
  /** Reserved seats after booking commit. */
  reservedSeats: number;
  /** Remaining seats after booking commit. */
  availableSeats: number;
}

/**
 * RPC result payload returned after successful seat lock.
 */
export interface LockSeatResult {
  /** Created/updated booking id. */
  bookingId: string;
  /** Target ride instance id. */
  rideInstanceId: string;
  /** Rider user id. */
  riderId: string;
  /** Current booking state. */
  status: BookingStatus;
  /** Seats currently locked by this booking. */
  seatCount: number;
  /** Lock expiry timestamp. */
  lockExpiresAt: string | null;
  /** Vehicle capacity for this ride instance. */
  capacity: number;
  /** Seats currently reserved across active bookings. */
  reservedSeats: number;
  /** Remaining seats after lock. */
  availableSeats: number;
}

/**
 * Booking row plus minimal ride instance relation used for "my bookings".
 */
export interface BookingWithRideRecord extends BookingRecord {
  /** Embedded ride instance projection from relational select. */
  ride_instance: {
    /** Related route id. */
    route_id: string;
    /** Related vehicle id. */
    vehicle_id: string;
    /** Ride date. */
    ride_date: string;
    /** Departure time. */
    departure_time: string;
    /** Ride status. */
    status: string;
  } | null;
}

/**
 * Booking row with minimal ride assignment context used for driver boarding checks.
 */
export interface DriverBookingRecord extends BookingRecord {
  /** Embedded ride instance projection for driver ownership validation. */
  ride_instance: {
    /** Ride instance id. */
    id: string;
    /** Assigned driver user id. */
    driver_id: string | null;
  } | null;
}

/**
 * Input payload for transactional driver boarding/no-show updates.
 */
export interface DriverMarkBookingInput {
  /** Booking id to update. */
  bookingId: string;
  /** Authenticated driver user id. */
  driverId: string;
  /** Target action normalized to DB status values. */
  action: 'boarded' | 'no_show';
}
