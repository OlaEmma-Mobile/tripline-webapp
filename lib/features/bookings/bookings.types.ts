export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'booked'
  | 'boarded'
  | 'no_show'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type BoardingStatus =
  | 'none'
  | 'requested'
  | 'approved'
  | 'declined'
  | 'expired'
  | 'passcode_verified';

export type BoardingVerificationMethod = 'rider_approved' | 'driver_verified_passcode';

/**
 * Raw booking row from Postgres.
 */
export interface BookingRecord {
  /** Primary key. */
  id: string;
  /** Linked trip id. */
  trip_id: string | null;
  /** Linked ride instance id. */
  ride_instance_id: string;
  /** Linked rider user id. */
  rider_id: string;
  /** Selected pickup point for this booking. */
  pickup_point_id: string | null;
  /** Stored pickup point latitude snapshot at booking time. */
  pickup_point_latitude: number | null;
  /** Stored pickup point longitude snapshot at booking time. */
  pickup_point_longitude: number | null;
  /** Token cost per seat at booking stop. */
  token_cost: number;
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
  /** Current boarding verification state. */
  boarding_status: BoardingStatus;
  /** Time a driver requested boarding verification. */
  boarding_requested_at: string | null;
  /** Time the active boarding request expires. */
  boarding_expires_at: string | null;
  /** Driver who initiated the boarding request. */
  boarding_requested_by_driver_id: string | null;
  /** Time rider approved the boarding request. */
  boarding_approved_at: string | null;
  /** Time rider declined the boarding request. */
  boarding_declined_at: string | null;
  /** Optional rider decline reason. */
  boarding_decline_reason: string | null;
  /** Time boarding was verified/finalized. */
  boarding_verified_at: string | null;
  /** Verification method used for boarding. */
  boarding_verification_method: BoardingVerificationMethod | null;
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
  /** Trip id. */
  tripId: string | null;
  /** Ride instance id. */
  rideInstanceId: string;
  /** Rider user id. */
  riderId: string;
  /** Pickup point id. */
  pickupPointId: string | null;
  /** Stored pickup point latitude snapshot. */
  pickupPointLatitude: number | null;
  /** Stored pickup point longitude snapshot. */
  pickupPointLongitude: number | null;
  /** Token cost per seat. */
  tokenCost: number;
  /** Pickup point display name when requested with joins. */
  pickupPointName?: string | null;
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
  /** Current boarding verification state. */
  boardingStatus: BoardingStatus;
  /** Boarding request timestamp. */
  boardingRequestedAt: string | null;
  /** Boarding request expiry timestamp. */
  boardingExpiresAt: string | null;
  /** Driver who requested boarding verification. */
  boardingRequestedByDriverId: string | null;
  /** Rider approval timestamp. */
  boardingApprovedAt: string | null;
  /** Rider decline timestamp. */
  boardingDeclinedAt: string | null;
  /** Optional rider decline reason. */
  boardingDeclineReason: string | null;
  /** Final boarding verification timestamp. */
  boardingVerifiedAt: string | null;
  /** Verification method used to board. */
  boardingVerificationMethod: BoardingVerificationMethod | null;
  /** Creation timestamp. */
  createdAt: string;
  /** Last update timestamp. */
  updatedAt: string;
}

/**
 * Input for seat lock request.
 */
export interface LockSeatInput {
  /** Target trip id. */
  tripId: string;
  /** Number of seats to reserve. */
  seatCount: number;
  /** Optional lock lifetime in minutes; defaults at RPC level. */
  lockMinutes?: number;
}

/**
 * Input for direct booking with atomic token deduction.
 */
export interface CreateBookingInput {
  /** Target trip id. */
  tripId: string;
  /** Pickup point id on route. */
  pickupPointId: string;
  /** Number of seats to book. */
  seatCount: number;
}

/**
 * RPC result for direct booking + token deduction transaction.
 */
export interface CreateBookingResult {
  /** Created booking id. */
  bookingId: string;
  /** Trip id. */
  tripId: string;
  /** Ride instance id. */
  rideInstanceId: string;
  /** Rider id. */
  riderId: string;
  /** Booking status, expected `booked`. */
  status: BookingStatus;
  /** Pickup point id used for booking. */
  pickupPointId: string;
  /** Stored pickup point latitude used for booking. */
  pickupPointLatitude: number | null;
  /** Stored pickup point longitude used for booking. */
  pickupPointLongitude: number | null;
  /** Token cost per seat resolved at booking time. */
  tokenCost: number;
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
  /** Target trip id. */
  tripId: string;
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
  trip: {
    id: string;
    trip_id: string;
    driver_trip_id: string | null;
    vehicle_id: string | null;
  } | null;
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
  /** Embedded pickup point details if selected. */
  pickup_point?: {
    id: string;
    name: string;
    token_cost: number;
  } | null;
}

/**
 * Booking row with minimal ride assignment context used for driver boarding checks.
 */
export interface DriverBookingRecord extends BookingRecord {
  trip: {
    id: string;
  } | null;
  /** Embedded ride instance projection for driver ownership validation. */
  ride_instance: {
    /** Ride instance id. */
    id: string;
  } | null;
}

export interface BoardingContextRecord extends BookingRecord {
  trip: {
    id: string;
    driver_id: string | null;
    status: string;
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

export interface RequestBoardingInput {
  bookingId: string;
  tripId: string;
  driverId: string;
}

export interface RespondBoardingInput {
  bookingId: string;
  riderId: string;
  decision: 'approve' | 'decline';
  passcode?: string;
  declineReason?: string;
}

export interface VerifyBoardingPasscodeInput {
  bookingId: string;
  tripId: string;
  driverId: string;
  passcode: string;
}
