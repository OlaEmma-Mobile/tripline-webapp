export type TripStatus = 'scheduled' | 'boarding' | 'departed' | 'completed' | 'cancelled';

export interface TripRecord {
  id: string;
  trip_id: string;
  ride_instance_id: string;
  assignment_id: string | null;
  driver_id: string;
  vehicle_id: string;
  driver_trip_id: string;
  status: TripStatus;
  created_at: string;
  updated_at: string;
}

export interface TripAvailabilityRecord {
  id: string;
  trip_id: string;
  driver_trip_id: string;
  ride_instance_id: string;
  ride_id: string;
  route_id: string;
  driver_id: string;
  vehicle_id: string;
  ride_date: string;
  departure_time: string;
  time_slot: 'morning' | 'afternoon' | 'evening';
  status: TripStatus;
  capacity: number;
  reserved_seats: number;
  available_seats: number;
  created_at: string;
  updated_at: string;
}

export interface TripDTO {
  id: string;
  tripId: string;
  driverTripId: string;
  rideInstanceId: string;
  rideId: string;
  routeId: string;
  driverId: string;
  vehicleId: string;
  rideDate: string;
  departureTime: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  status: TripStatus;
  capacity: number;
  reservedSeats: number;
  availableSeats: number;
  createdAt: string;
  updatedAt: string;
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  } | null;
  vehicle?: {
    id: string;
    registrationNumber: string;
    model: string | null;
    capacity: number;
  } | null;
}
