export type RideInstanceStatus =
  | 'scheduled'
  | 'boarding'
  | 'departed'
  | 'completed'
  | 'cancelled';

export type RideTimeSlot = 'morning' | 'afternoon' | 'evening';

/**
 * Raw ride instance row returned from Postgres.
 */
export interface RideInstanceRecord {
  /** Primary key. */
  id: string;
  /** Human-readable ride code (TL-0000). */
  ride_id: string;
  /** Linked route id. */
  route_id: string;
  /** Linked vehicle id when a primary assignment vehicle exists. */
  vehicle_id: string | null;
  /** Service date in YYYY-MM-DD. */
  ride_date: string;
  /** Departure time in HH:MM[:SS]. */
  departure_time: string;
  /** Time slot for assignment constraints. */
  time_slot: RideTimeSlot;
  /** Operational state of this departure. */
  status: RideInstanceStatus;
  /** Creation timestamp. */
  created_at: string;
  /** Last update timestamp. */
  updated_at: string;
}

/**
 * Availability projection row from `ride_instance_availability` view.
 */
export interface RideInstanceAvailabilityRecord {
  /** Ride instance id (aliased in view). */
  ride_instance_id: string;
  /** Human-readable ride code (TL-0000). */
  ride_id: string;
  /** Linked route id. */
  route_id: string;
  /** Linked vehicle id when a primary assignment vehicle exists. */
  vehicle_id: string | null;
  /** Service date in YYYY-MM-DD. */
  ride_date: string;
  /** Departure time in HH:MM[:SS]. */
  departure_time: string;
  /** Time slot for assignment constraints. */
  time_slot: RideTimeSlot;
  /** Operational state of this departure. */
  status: RideInstanceStatus;
  /** Vehicle seat capacity. */
  capacity: number;
  /** Seats currently reserved by confirmed/non-expired pending bookings. */
  reserved_seats: number;
  /** Seats still available for booking. */
  available_seats: number;
  /** Creation timestamp of underlying ride instance. */
  created_at: string;
  /** Last update timestamp of underlying ride instance. */
  updated_at: string;
}

/**
 * API-safe camelCase ride instance shape exposed by services/routes.
 */
export interface RideInstanceDTO {
  /** Primary key. */
  id: string;
  /** Human-readable ride code (TL-0000). */
  rideId: string;
  /** Linked route id. */
  routeId: string;
  /** Linked vehicle id when a primary assignment vehicle exists. */
  vehicleId: string | null;
  /** Service date in YYYY-MM-DD. */
  rideDate: string;
  /** Departure time in HH:MM[:SS]. */
  departureTime: string;
  /** Time slot for assignment constraints. */
  timeSlot: RideTimeSlot;
  /** Operational state of this departure. */
  status: RideInstanceStatus;
  /** Optional legacy aggregate capacity. */
  capacity?: number;
  /** Optional legacy aggregate reserved seats. */
  reservedSeats?: number;
  /** Optional legacy aggregate available seats. */
  availableSeats?: number;
  /** Creation timestamp. */
  createdAt: string;
  /** Last update timestamp. */
  updatedAt: string;
  /** Optional route display name (admin-enriched responses). */
  routeName?: string;
  /** Optional vehicle registration number (admin-enriched responses). */
  vehiclePlate?: string | null;
  /** Optional driver full name (admin-enriched responses). */
  driverNames?: string[];
  /** Optional assigned driver count (admin-enriched responses). */
  assignedDriverCount?: number;
  /** Optional pickup point count for this route (admin-enriched responses). */
  pickupPointsCount?: number;
  /** Bookable operational trips beneath this ride instance. */
  trips?: Array<{
    id: string;
    tripId: string;
    driverTripId: string;
    driverId: string;
    vehicleId: string;
    status: RideInstanceStatus;
    capacity: number;
    reservedSeats: number;
    availableSeats: number;
  }>;
}

/**
 * Query options for listing ride instances.
 */
export interface RideInstanceFilters {
  /** Page number (1-indexed). */
  page: number;
  /** Page size. */
  limit: number;
  /** Optional route filter. */
  routeId?: string;
  /** Optional date filter (YYYY-MM-DD). */
  rideDate?: string;
  /** Optional time slot filter. */
  timeSlot?: RideTimeSlot;
  /** Optional status filter. */
  status?: RideInstanceStatus;
  /** Optional multi-status filter (used for rider-facing availability). */
  statuses?: RideInstanceStatus[];
}

/**
 * Payload for creating a single ride instance.
 */
export interface CreateRideInstanceInput {
  /** Route id. */
  routeId: string;
  /** Service date (YYYY-MM-DD). */
  rideDate: string;
  /** Departure time (HH:MM[:SS]). */
  departureTime: string;
  /** Time slot (morning/afternoon/evening). */
  timeSlot: RideTimeSlot;
  /** Optional initial status. */
  status?: RideInstanceStatus;
}

/**
 * Payload for creating multiple departures for the same date.
 */
export interface CreateRideInstancesBulkInput {
  /** Route id. */
  routeId: string;
  /** Service date (YYYY-MM-DD). */
  rideDate: string;
  /** Departure times for separate ride instance rows. */
  departureTimes: string[];
  /** Time slot (morning/afternoon/evening). */
  timeSlot: RideTimeSlot;
  /** Optional initial status for all created rows. */
  status?: RideInstanceStatus;
}

/**
 * Patch payload for ride instance updates.
 */
export interface UpdateRideInstanceInput {
  /** Optional route id update. */
  routeId?: string;
  /** Optional vehicle id update (used internally when syncing primary vehicle). */
  vehicleId?: string | null;
  /** Optional date update (YYYY-MM-DD). */
  rideDate?: string;
  /** Optional departure time update (HH:MM[:SS]). */
  departureTime?: string;
  /** Optional time slot update. */
  timeSlot?: RideTimeSlot;
  /** Optional status update. */
  status?: RideInstanceStatus;
}

export interface DriverLocationUpdateResult {
  rideInstanceId: string;
  lat: number;
  lng: number;
  driverOnline: boolean;
  rideStatus: RideInstanceStatus;
}

export interface RideInstanceDetailRecord {
  id: string;
  ride_id: string;
  route_id: string;
  vehicle_id: string | null;
  ride_date: string;
  departure_time: string;
  time_slot: RideTimeSlot;
  status: RideInstanceStatus;
  route: {
    id: string;
    name: string;
    from_name: string;
    to_name: string;
    from_latitude: number;
    from_longitude: number;
    to_latitude: number;
    to_longitude: number;
  } | null;
  drivers: Array<{
    id: string;
    driver_trip_id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string;
    assigned_vehicle: {
      vehicle_id: string;
      registration_number: string;
      model: string | null;
      capacity: number;
      assigned_at: string;
    } | null;
  }>;
  vehicle: {
    id: string;
    registration_number: string;
    model: string | null;
    capacity: number;
  } | null;
}

export interface RiderRideInstanceDetailDTO {
  id: string;
  rideId: string;
  rideDate: string;
  departureTime: string;
  timeSlot: RideTimeSlot;
  status: RideInstanceStatus;
  route: RideInstanceDetailRecord['route'];
  drivers: RideInstanceDetailRecord['drivers'];
  vehicle: RideInstanceDetailRecord['vehicle'];
  capacity?: number;
  reservedSeats?: number;
  availableSeats?: number;
  trips: Array<{
    id: string;
    tripId: string;
    driverTripId: string;
    driverId: string;
    vehicleId: string;
    status: RideInstanceStatus;
    capacity: number;
    reservedSeats: number;
    availableSeats: number;
  }>;
  pickupPoints: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    orderIndex: number;
    tokenCost: number;
  }>;
}
