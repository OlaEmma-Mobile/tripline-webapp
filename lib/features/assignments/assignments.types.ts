export type AssignmentStatus = 'active' | 'ended';

export interface DriverVehicleAssignmentRecord {
  id: string;
  driver_id: string;
  vehicle_id: string;
  status: AssignmentStatus;
  assigned_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface DriverRouteAssignmentRecord {
  id: string;
  driver_id: string;
  route_id: string;
  status: AssignmentStatus;
  assigned_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface RideInstanceDriverAssignmentRecord {
  id: string;
  ride_instance_id: string;
  driver_id: string;
  driver_trip_id: string;
  status: AssignmentStatus;
  assigned_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface AssignmentDTO {
  id: string;
  driverId: string;
  vehicleId?: string;
  routeId?: string;
  rideInstanceId?: string;
  driverTripId?: string;
  tripId?: string;
  tripCode?: string;
  status: AssignmentStatus;
  assignedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export interface AssignDriverVehicleInput {
  driverId: string;
  vehicleId: string;
}

export interface AssignDriverRouteInput {
  driverId: string;
  routeId: string;
}

export interface AssignRideInstanceDriversInput {
  rideInstanceId: string;
  driverIds: string[];
}
