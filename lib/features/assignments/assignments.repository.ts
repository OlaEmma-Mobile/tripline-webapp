import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type {
  DriverRouteAssignmentRecord,
  RideInstanceDriverAssignmentRecord,
  DriverVehicleAssignmentRecord,
} from './assignments.types';

interface DriverLookup {
  id: string;
  role: 'driver' | 'rider' | 'admin' | 'sub_admin';
  status: 'active' | 'inactive' | 'restricted';
}

interface VehicleLookup {
  id: string;
  status: 'active' | 'inactive' | 'maintenance';
}

interface RouteLookup {
  id: string;
  status: 'active' | 'inactive';
}

interface RideInstanceLookup {
  id: string;
  ride_id: string;
  vehicle_id?: string | null;
  ride_date: string;
  time_slot: 'morning' | 'afternoon' | 'evening';
  status: 'scheduled' | 'boarding' | 'departed' | 'completed' | 'cancelled';
}

/**
 * Persistence for driver assignment workflows.
 */
export class AssignmentsRepository {
  /** Get driver user for assignment validation. */
  async getDriver(driverId: string): Promise<DriverLookup | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, role, status')
      .eq('id', driverId)
      .maybeSingle<DriverLookup>();

    if (error) {
      throw new AppError('Unable to fetch driver', 500);
    }
    return data ?? null;
  }

  /** Get vehicle for assignment validation. */
  async getVehicle(vehicleId: string): Promise<VehicleLookup | null> {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('id, status')
      .eq('id', vehicleId)
      .maybeSingle<VehicleLookup>();

    if (error) {
      throw new AppError('Unable to fetch vehicle', 500);
    }
    return data ?? null;
  }

  /** Get route for assignment validation. */
  async getRoute(routeId: string): Promise<RouteLookup | null> {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('id, status')
      .eq('id', routeId)
      .maybeSingle<RouteLookup>();

    if (error) {
      throw new AppError('Unable to fetch route', 500);
    }
    return data ?? null;
  }

  /** Get ride instance for assignment validation. */
  async getRideInstance(rideInstanceId: string): Promise<RideInstanceLookup | null> {
    const { data, error } = await supabaseAdmin
      .from('ride_instances')
.select('id, ride_id, vehicle_id, ride_date, time_slot, status')
      .eq('id', rideInstanceId)
      .maybeSingle<RideInstanceLookup>();

    if (error) {
      throw new AppError('Unable to fetch ride instance', 500);
    }
    return data ?? null;
  }

  /** End current active assignment for a driver->vehicle relation (by driver). */
  async endActiveDriverVehicleByDriver(driverId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('driver_id', driverId)
      .eq('status', 'active');

    if (error) {
      throw new AppError('Unable to end existing driver vehicle assignment', 500);
    }
  }

  /** End current active assignment for vehicle (so vehicle cannot have two active drivers). */
  async endActiveDriverVehicleByVehicle(vehicleId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active');

    if (error) {
      throw new AppError('Unable to end existing vehicle assignment', 500);
    }
  }

  /** Find active driver->vehicle assignment by vehicle id. */
  async getActiveDriverVehicleAssignmentByVehicle(
    vehicleId: string
  ): Promise<DriverVehicleAssignmentRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active')
      .maybeSingle<DriverVehicleAssignmentRecord>();

    if (error) {
      throw new AppError('Unable to fetch active vehicle assignment', 500);
    }

    return data ?? null;
  }

  /** Find active driver->vehicle assignment by driver id. */
  async getActiveDriverVehicleAssignmentByDriver(
    driverId: string
  ): Promise<DriverVehicleAssignmentRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .select('*')
      .eq('driver_id', driverId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false })
      .maybeSingle<DriverVehicleAssignmentRecord>();

    if (error) {
      throw new AppError('Unable to fetch active driver vehicle assignment', 500);
    }

    return data ?? null;
  }

  /** Insert a new active driver->vehicle assignment. */
  async createDriverVehicleAssignment(driverId: string, vehicleId: string): Promise<DriverVehicleAssignmentRecord> {
    const { data, error } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .insert({ driver_id: driverId, vehicle_id: vehicleId, status: 'active' })
      .select('*')
      .single<DriverVehicleAssignmentRecord>();

    if (error || !data) {
      throw new AppError('Unable to create driver vehicle assignment', 500);
    }
    return data;
  }

  /** End current active assignment for a driver->route relation by driver id. */
  async endActiveDriverRouteByDriver(driverId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('driver_route_assignments')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('driver_id', driverId)
      .eq('status', 'active');

    if (error) {
      throw new AppError('Unable to end existing driver route assignment', 500);
    }
  }

  /** Insert a new active driver->route assignment. */
  async createDriverRouteAssignment(driverId: string, routeId: string): Promise<DriverRouteAssignmentRecord> {
    const { data, error } = await supabaseAdmin
      .from('driver_route_assignments')
      .insert({ driver_id: driverId, route_id: routeId, status: 'active' })
      .select('*')
      .single<DriverRouteAssignmentRecord>();

    if (error || !data) {
      throw new AppError('Unable to create driver route assignment', 500);
    }
    return data;
  }

  /** Fetch driver-vehicle assignment by id. */
  async getDriverVehicleAssignmentById(id: string): Promise<DriverVehicleAssignmentRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .select('*')
      .eq('id', id)
      .maybeSingle<DriverVehicleAssignmentRecord>();

    if (error) {
      throw new AppError('Unable to fetch driver vehicle assignment', 500);
    }
    return data ?? null;
  }

  /** Fetch driver-route assignment by id. */
  async getDriverRouteAssignmentById(id: string): Promise<DriverRouteAssignmentRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('driver_route_assignments')
      .select('*')
      .eq('id', id)
      .maybeSingle<DriverRouteAssignmentRecord>();

    if (error) {
      throw new AppError('Unable to fetch driver route assignment', 500);
    }
    return data ?? null;
  }

  /** Mark a driver-vehicle assignment as ended by id. */
  async endDriverVehicleAssignmentById(id: string): Promise<DriverVehicleAssignmentRecord> {
    const { data, error } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single<DriverVehicleAssignmentRecord>();

    if (error || !data) {
      throw new AppError('Unable to end driver vehicle assignment', 500);
    }
    return data;
  }

  /** Mark a driver-route assignment as ended by id. */
  async endDriverRouteAssignmentById(id: string): Promise<DriverRouteAssignmentRecord> {
    const { data, error } = await supabaseAdmin
      .from('driver_route_assignments')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single<DriverRouteAssignmentRecord>();

    if (error || !data) {
      throw new AppError('Unable to end driver route assignment', 500);
    }
    return data;
  }

  /** Find active ride assignments for a ride instance. */
  async listActiveRideDriverAssignments(
    rideInstanceId: string
  ): Promise<RideInstanceDriverAssignmentRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('ride_instance_driver_assignments')
      .select('*')
      .eq('ride_instance_id', rideInstanceId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: true })
      .returns<RideInstanceDriverAssignmentRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch ride driver assignments', 500);
    }
    return data ?? [];
  }

  /** Find active ride assignment by ride and driver. */
  async getActiveRideDriverAssignment(
    rideInstanceId: string,
    driverId: string
  ): Promise<RideInstanceDriverAssignmentRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('ride_instance_driver_assignments')
      .select('*')
      .eq('ride_instance_id', rideInstanceId)
      .eq('driver_id', driverId)
      .eq('status', 'active')
      .maybeSingle<RideInstanceDriverAssignmentRecord>();

    if (error) {
      throw new AppError('Unable to fetch ride driver assignment', 500);
    }
    return data ?? null;
  }

  async getRideDriverAssignmentById(id: string): Promise<RideInstanceDriverAssignmentRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('ride_instance_driver_assignments')
      .select('*')
      .eq('id', id)
      .maybeSingle<RideInstanceDriverAssignmentRecord>();

    if (error) {
      throw new AppError('Unable to fetch ride driver assignment', 500);
    }
    return data ?? null;
  }

  /** Find conflicting active ride assignment for driver on same date + slot. */
  async getDriverRideAssignmentConflict(
    driverId: string,
    rideDate: string,
    timeSlot: string
  ): Promise<RideInstanceDriverAssignmentRecord | null> {
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('ride_instance_driver_assignments')
.select('id, ride_instance_id, driver_id, driver_trip_id, status, assigned_at, ended_at, created_at')
      .eq('driver_id', driverId)
      .eq('status', 'active')
      .returns<RideInstanceDriverAssignmentRecord[]>();

    if (assignmentError) {
      throw new AppError('Unable to validate ride driver assignment', 500);
    }

    const rideIds = (assignments ?? []).map((assignment) => assignment.ride_instance_id);
    if (rideIds.length === 0) return null;

    const { data: rides, error: ridesError } = await supabaseAdmin
      .from('ride_instances')
      .select('id')
      .in('id', rideIds)
      .eq('ride_date', rideDate)
      .eq('time_slot', timeSlot)
      .limit(1)
      .returns<Array<{ id: string }>>();

    if (ridesError) {
      throw new AppError('Unable to validate ride driver assignment', 500);
    }

    const conflictingRideId = rides?.[0]?.id;
    if (!conflictingRideId) return null;

    return (assignments ?? []).find((assignment) => assignment.ride_instance_id === conflictingRideId) ?? null;
  }

  /** Create new active ride-driver assignment. */
  async createRideDriverAssignment(
    rideInstanceId: string,
    driverId: string
  ): Promise<RideInstanceDriverAssignmentRecord> {
    const { data, error } = await supabaseAdmin
      .from('ride_instance_driver_assignments')
      .insert({ ride_instance_id: rideInstanceId, driver_id: driverId, status: 'active' })
      .select('*')
      .single<RideInstanceDriverAssignmentRecord>();

    if (error?.code === '23505') {
      throw new AppError('Driver is already assigned to this ride', 409);
    }
    if (error || !data) {
      throw new AppError('Unable to assign driver to ride', 500);
    }
    return data;
  }

  /** End active ride-driver assignment. */
  async endRideDriverAssignment(
    rideInstanceId: string,
    driverId: string
  ): Promise<RideInstanceDriverAssignmentRecord> {
    const { data, error } = await supabaseAdmin
      .from('ride_instance_driver_assignments')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('ride_instance_id', rideInstanceId)
      .eq('driver_id', driverId)
      .eq('status', 'active')
      .select('*')
      .single<RideInstanceDriverAssignmentRecord>();

    if (error || !data) {
      throw new AppError('Unable to end ride driver assignment', 500);
    }
    return data;
  }

  /** Check whether driver is actively assigned to a ride instance. */
  async isDriverAssignedToRide(rideInstanceId: string, driverId: string): Promise<boolean> {
    const assignment = await this.getActiveRideDriverAssignment(rideInstanceId, driverId);
    return Boolean(assignment);
  }

  /** Syncs ride_instances.vehicle_id from the first active assigned driver's vehicle, or null when none exist. */
  async syncRideVehicleFromAssignments(rideInstanceId: string): Promise<void> {
    const assignments = await this.listActiveRideDriverAssignments(rideInstanceId);
    let vehicleId: string | null = null;

    for (const assignment of assignments) {
      const vehicleAssignment = await this.getActiveDriverVehicleAssignmentByDriver(assignment.driver_id);
      if (vehicleAssignment?.vehicle_id) {
        vehicleId = vehicleAssignment.vehicle_id;
        break;
      }
    }

    const { error } = await supabaseAdmin
      .from('ride_instances')
      .update({ vehicle_id: vehicleId })
      .eq('id', rideInstanceId);

    if (error) {
      throw new AppError('Unable to sync ride vehicle', 500);
    }
  }
}

export const assignmentsRepository = new AssignmentsRepository();
