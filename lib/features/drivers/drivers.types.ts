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
  booking_id: string;
  user_id: string;
  user_name: string;
  pickup_point_id: string | null;
  booking_status: string;
}

export interface DriverManifestRideDTO {
  ride_instance_id: string;
  route_name: string;
  departure_time: string;
  vehicle_plate: string;
  passengers: DriverManifestPassengerDTO[];
}

export interface DriverManifestDTO {
  date: string;
  rides: DriverManifestRideDTO[];
}

export interface DriverManifestBookingRow {
  id: string;
  rider_id: string;
  status: string;
  rider: {
    first_name: string;
    last_name: string;
  } | null;
}

export interface DriverManifestRideRow {
  id: string;
  departure_time: string;
  route: {
    name: string;
  } | null;
  vehicle: {
    registration_number: string;
  } | null;
  bookings: DriverManifestBookingRow[] | null;
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
