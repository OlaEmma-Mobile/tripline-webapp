export type DriverStatus = 'active' | 'inactive' | 'restricted';
export type DriverKycStatus = 'pending' | 'verified' | 'rejected' | null;

export interface DriverRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: 'driver';
  password_hash: string;
  email_verified_at: string | null;
  status: DriverStatus;
  created_at: string;
  updated_at: string;
}

export interface DriverDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: 'driver';
  emailVerified: boolean;
  status: DriverStatus;
  kycStatus: DriverKycStatus;
  assignedVehicle: {
    assignmentId: string;
    vehicleId: string;
    registrationNumber: string;
    assignedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverFilters {
  page: number;
  limit: number;
  status?: DriverStatus;
  q?: string;
  rideDate?: string;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
  rideInstanceId?: string;
}

export interface CreateDriverInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  status?: DriverStatus;
}

export interface UpdateDriverInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: DriverStatus;
}

export interface DriverKycRecordLite {
  status: 'pending' | 'verified' | 'rejected';
}

export interface DriverManifestPassengerDTO {
  bookingId: string;
  userId: string;
  userName: string;
  pickupPointId: string | null;
  pickupPointName?: string | null;
  pickupPointLatitude: number | null;
  pickupPointLongitude: number | null;
  bookingStatus: string;
  boardingStatus: string;
  boardedAt: string | null;
  boardingExpiresAt: string | null;
  boardingVerificationMethod: string | null;
}

export interface DriverManifestTripDTO {
  id: string;
  tripId: string;
  driverTripId: string;
  rideInstanceId: string;
  rideId: string;
  rideDate: string;
  departureTime: string;
  estimatedDurationMinutes: number;
  timeSlot: string;
  status: string;
  vehiclePlate: string;
  capacity: number;
  route: {
    name: string;
    fromName: string;
    toName: string;
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
  };
  totalPassengers: number;
  totalBoarded: number;
}

export interface DriverManifestDTO {
  date: string;
  trips: DriverManifestTripDTO[];
}

export interface DriverManifestBookingRow {
  id: string;
  rider_id: string;
  status: string;
  pickup_point_latitude: number | null;
  pickup_point_longitude: number | null;
  boarding_status: string;
  boarded_at: string | null;
  boarding_approved_at: string | null;
  boarding_verified_at: string | null;
  boarding_expires_at: string | null;
  boarding_verification_method: string | null;
  pickup_point: { id: string; name: string } | null;
  rider: {
    first_name: string;
    last_name: string;
  } | null;
}

export interface DriverManifestRideRow {
  id: string;
  trip_id: string;
  ride_instance_id: string;
  driver_trip_id: string;
  ride_id: string;
  ride_date: string;
  departure_time: string;
  estimated_duration_minutes: number;
  time_slot: string;
  status: string;
  capacity: number;
  route: {
    name: string;
    from_name: string;
    to_name: string;
    from_latitude: number;
    from_longitude: number;
    to_latitude: number;
    to_longitude: number;
  } | null;
  vehicle: {
    registration_number: string;
  } | null;
}

export interface DriverManifestCountsRow {
  trip_id: string;
  total_passengers: number;
  total_boarded: number;
}

export interface DriverManifestDetailDTO {
  id: string;
  tripId: string;
  driverTripId: string | null;
  status: string;
  departureTime: string;
  estimatedDurationMinutes: number;
  capacity: number;
  reservedSeats: number;
  availableSeats: number;
  rideInstance: {
    id: string;
    rideId: string;
    rideDate: string;
    timeSlot: string;
    route: {
      id: string;
      name: string;
      fromName: string;
      toName: string;
      fromLat: number;
      fromLng: number;
      toLat: number;
      toLng: number;
    } | null;
  };
  driver: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  } | null;
  vehicle: {
    id: string;
    registrationNumber: string;
    model: string | null;
    capacity: number;
  } | null;
  pickupPoints: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    orderIndex: number;
    tokenCost: number;
  }>;
  passengers: DriverManifestPassengerDTO[];
}

export interface DriverVehicleAssignmentProjection {
  id: string;
  driver_id: string;
  vehicle_id: string;
  assigned_at: string;
  vehicle: {
    id: string;
    registration_number: string;
  } | null;
}
