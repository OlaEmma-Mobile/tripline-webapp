import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type {
  DriverRouteAssignmentRecord,
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
}

export const assignmentsRepository = new AssignmentsRepository();
