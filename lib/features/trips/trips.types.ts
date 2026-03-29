export type TripStatus = 'scheduled' | 'awaiting_driver' | 'ongoing' | 'completed' | 'cancelled';

export interface TripRecord {
  id: string;
  trip_id: string;
  ride_instance_id: string;
  assignment_id: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  driver_trip_id: string | null;
  departure_time: string;
  estimated_duration_minutes: number;
  status: TripStatus;
  created_at: string;
  updated_at: string;
}

export interface TripAvailabilityRecord {
  id: string;
  trip_id: string;
  driver_trip_id: string | null;
  ride_instance_id: string;
  ride_id: string;
  route_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  ride_date: string;
  departure_time: string;
  estimated_duration_minutes: number;
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
  driverTripId: string | null;
  rideInstanceId: string;
  rideId: string;
  routeId: string;
  driverId: string | null;
  vehicleId: string | null;
  rideDate: string;
  departureTime: string;
  estimatedDurationMinutes: number;
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

export interface RiderTripDetailDTO {
  id: string;
  tripId: string;
  driverTripId: string | null;
  status: TripStatus;
  departureTime: string;
  estimatedDurationMinutes: number;
  capacity: number;
  reservedSeats: number;
  availableSeats: number;
  rideInstance: {
    id: string;
    rideId: string;
    rideDate: string;
    timeSlot: 'morning' | 'afternoon' | 'evening';
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
}
