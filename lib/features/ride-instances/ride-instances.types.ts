export type RideInstanceStatus =
  | 'scheduled'
  | 'boarding'
  | 'departed'
  | 'completed'
  | 'cancelled';

/**
 * Raw ride instance row returned from Postgres.
 */
export interface RideInstanceRecord {
  /** Primary key. */
  id: string;
  /** Linked route id. */
  route_id: string;
  /** Linked vehicle id. */
  vehicle_id: string;
  /** Linked driver id (nullable if unassigned). */
  driver_id: string | null;
  /** Service date in YYYY-MM-DD. */
  ride_date: string;
  /** Departure time in HH:MM[:SS]. */
  departure_time: string;
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
  /** Linked route id. */
  route_id: string;
  /** Linked vehicle id. */
  vehicle_id: string;
  /** Linked driver id. */
  driver_id: string | null;
  /** Service date in YYYY-MM-DD. */
  ride_date: string;
  /** Departure time in HH:MM[:SS]. */
  departure_time: string;
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
  /** Linked route id. */
  routeId: string;
  /** Linked vehicle id. */
  vehicleId: string;
  /** Linked driver id (nullable if unassigned). */
  driverId: string | null;
  /** Service date in YYYY-MM-DD. */
  rideDate: string;
  /** Departure time in HH:MM[:SS]. */
  departureTime: string;
  /** Operational state of this departure. */
  status: RideInstanceStatus;
  /** Vehicle seat capacity. */
  capacity: number;
  /** Seats currently reserved. */
  reservedSeats: number;
  /** Seats currently available. */
  availableSeats: number;
  /** Creation timestamp. */
  createdAt: string;
  /** Last update timestamp. */
  updatedAt: string;
  /** Optional route display name (admin-enriched responses). */
  routeName?: string;
  /** Optional vehicle registration number (admin-enriched responses). */
  vehiclePlate?: string;
  /** Optional driver full name (admin-enriched responses). */
  driverName?: string | null;
  /** Optional pickup point count for this route (admin-enriched responses). */
  pickupPointsCount?: number;
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
  /** Vehicle id. */
  vehicleId: string;
  /** Optional driver id. */
  driverId?: string;
  /** Service date (YYYY-MM-DD). */
  rideDate: string;
  /** Departure time (HH:MM[:SS]). */
  departureTime: string;
  /** Optional initial status. */
  status?: RideInstanceStatus;
}

/**
 * Payload for creating multiple departures for the same date.
 */
export interface CreateRideInstancesBulkInput {
  /** Route id. */
  routeId: string;
  /** Vehicle id. */
  vehicleId: string;
  /** Optional driver id. */
  driverId?: string;
  /** Service date (YYYY-MM-DD). */
  rideDate: string;
  /** Departure times for separate ride instance rows. */
  departureTimes: string[];
  /** Optional initial status for all created rows. */
  status?: RideInstanceStatus;
}

/**
 * Patch payload for ride instance updates.
 */
export interface UpdateRideInstanceInput {
  /** Optional route id update. */
  routeId?: string;
  /** Optional vehicle id update. */
  vehicleId?: string;
  /** Optional driver id update. */
  driverId?: string | null;
  /** Optional date update (YYYY-MM-DD). */
  rideDate?: string;
  /** Optional departure time update (HH:MM[:SS]). */
  departureTime?: string;
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
