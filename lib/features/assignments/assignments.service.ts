import { AppError } from '@/lib/utils/errors';
import { assignmentsRepository, AssignmentsRepository } from './assignments.repository';
import { realtimeService } from '@/lib/features/realtime/realtime.service';
import { logStep } from '@/lib/utils/logger';
import { tripsRepository } from '@/lib/features/trips/trips.repository';
import type {
  AssignmentDTO,
  AssignDriverRouteInput,
  AssignRideInstanceDriversInput,
  AssignDriverVehicleInput,
  DriverRouteAssignmentRecord,
  RideInstanceDriverAssignmentRecord,
  DriverVehicleAssignmentRecord,
} from './assignments.types';

/**
 * mapDriverVehicle Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapDriverVehicle(record: DriverVehicleAssignmentRecord): AssignmentDTO {
  return {
    id: record.id,
    driverId: record.driver_id,
    vehicleId: record.vehicle_id,
    status: record.status,
    assignedAt: record.assigned_at,
    endedAt: record.ended_at,
    createdAt: record.created_at,
  };
}

/**
 * mapDriverRoute Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapDriverRoute(record: DriverRouteAssignmentRecord): AssignmentDTO {
  return {
    id: record.id,
    driverId: record.driver_id,
    routeId: record.route_id,
    status: record.status,
    assignedAt: record.assigned_at,
    endedAt: record.ended_at,
    createdAt: record.created_at,
  };
}

/**
 * mapRideDriver Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapRideDriver(record: RideInstanceDriverAssignmentRecord): AssignmentDTO {
  return {
    id: record.id,
    driverId: record.driver_id,
    rideInstanceId: record.ride_instance_id,
    driverTripId: record.driver_trip_id,
    status: record.status,
    assignedAt: record.assigned_at,
    endedAt: record.ended_at,
    createdAt: record.created_at,
  };
}

/**
 * Assignment business logic.
 */
export class AssignmentsService {
  constructor(private readonly repo: AssignmentsRepository) {}

  /**
   * Assign a driver to a vehicle after ending any previous active assignments for both entities.
   */
  async assignDriverVehicle(input: AssignDriverVehicleInput): Promise<AssignmentDTO> {
    const driver = await this.repo.getDriver(input.driverId);
    if (!driver || driver.role !== 'driver') {
      throw new AppError('Driver not found', 404);
    }
    if (driver.status !== 'active') {
      throw new AppError('Driver must be active for assignment', 400);
    }

    const vehicle = await this.repo.getVehicle(input.vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    if (vehicle.status !== 'active') {
      throw new AppError('Vehicle must be active for assignment', 400);
    }

    const existingVehicleAssignment = await this.repo.getActiveDriverVehicleAssignmentByVehicle(
      input.vehicleId
    );
    if (existingVehicleAssignment && existingVehicleAssignment.driver_id !== input.driverId) {
      throw new AppError('Vehicle is already assigned to another driver', 409);
    }

    await this.repo.endActiveDriverVehicleByDriver(input.driverId);

    const assignment = await this.repo.createDriverVehicleAssignment(input.driverId, input.vehicleId);
    return mapDriverVehicle(assignment);
  }

  /**
   * Assign a driver to a route after ending previous active route assignment for that driver.
   */
  async assignDriverRoute(input: AssignDriverRouteInput): Promise<AssignmentDTO> {
    const driver = await this.repo.getDriver(input.driverId);
    if (!driver || driver.role !== 'driver') {
      throw new AppError('Driver not found', 404);
    }
    if (driver.status !== 'active') {
      throw new AppError('Driver must be active for assignment', 400);
    }

    const route = await this.repo.getRoute(input.routeId);
    if (!route) {
      throw new AppError('Route not found', 404);
    }
    if (route.status !== 'active') {
      throw new AppError('Route must be active for assignment', 400);
    }

    await this.repo.endActiveDriverRouteByDriver(input.driverId);
    const assignment = await this.repo.createDriverRouteAssignment(input.driverId, input.routeId);
    return mapDriverRoute(assignment);
  }

  /** End a driver->vehicle assignment by id. */
  async endDriverVehicleAssignment(id: string): Promise<AssignmentDTO> {
    const existing = await this.repo.getDriverVehicleAssignmentById(id);
    if (!existing) {
      throw new AppError('Driver vehicle assignment not found', 404);
    }
    const ended = await this.repo.endDriverVehicleAssignmentById(id);
    return mapDriverVehicle(ended);
  }

  /** End a driver->route assignment by id. */
  async endDriverRouteAssignment(id: string): Promise<AssignmentDTO> {
    const existing = await this.repo.getDriverRouteAssignmentById(id);
    if (!existing) {
      throw new AppError('Driver route assignment not found', 404);
    }
    const ended = await this.repo.endDriverRouteAssignmentById(id);
    return mapDriverRoute(ended);
  }

  /**
   * Assign one or more drivers to a ride instance.
   */
  async assignRideDrivers(input: AssignRideInstanceDriversInput): Promise<AssignmentDTO[]> {
    const ride = await this.repo.getRideInstance(input.rideInstanceId);
    if (!ride) {
      throw new AppError('Ride instance not found', 404);
    }
    if (ride.status === 'cancelled' || ride.status === 'completed') {
      throw new AppError('Ride instance is closed for driver assignment', 409);
    }

    const results: AssignmentDTO[] = [];
    for (const driverId of input.driverIds) {
      const driver = await this.repo.getDriver(driverId);
      if (!driver || driver.role !== 'driver') {
        throw new AppError('Driver not found', 404);
      }
      if (driver.status !== 'active') {
        throw new AppError('Driver must be active for assignment', 400);
      }
      const activeVehicleAssignment = await this.repo.getActiveDriverVehicleAssignmentByDriver(driverId);
      if (!activeVehicleAssignment) {
        throw new AppError('Driver must have an active vehicle assignment', 400);
      }

      const existing = await this.repo.getActiveRideDriverAssignment(input.rideInstanceId, driverId);
      if (existing) {
        results.push(mapRideDriver(existing));
        continue;
      }

      const conflict = await this.repo.getDriverRideAssignmentConflict(
        driverId,
        ride.ride_date,
        ride.time_slot
      );
      if (conflict) {
        throw new AppError('Driver is already assigned to another ride for this date and slot', 409);
      }

      const created = await this.repo.createRideDriverAssignment(input.rideInstanceId, driverId);
      const trip = await tripsRepository.create({
        rideInstanceId: input.rideInstanceId,
        assignmentId: created.id,
        driverId,
        vehicleId: activeVehicleAssignment.vehicle_id,
        driverTripId: created.driver_trip_id,
        status: ride.status,
      });
      await this.repo.syncRideVehicleFromAssignments(input.rideInstanceId);
      try {
        await realtimeService.notifyUserEvent({
          userId: driverId,
          type: 'ride_assignment',
          title: 'New ride assignment',
          message: `You have been assigned to ride ${ride.ride_id} as trip ${created.driver_trip_id} on ${ride.ride_date} (${ride.time_slot}).`,
          reference: input.rideInstanceId,
          reason: 'DRIVER_ASSIGNED_RIDE',
          metadata: {
            rideInstanceId: input.rideInstanceId,
            rideId: ride.ride_id,
            driverTripId: created.driver_trip_id,
            rideDate: ride.ride_date,
            timeSlot: ride.time_slot,
          },
        });
      } catch {
        logStep('ride driver assignment notification failed', {
          rideInstanceId: input.rideInstanceId,
          driverId,
        });
      }
      results.push({
        ...mapRideDriver(created),
        vehicleId: activeVehicleAssignment.vehicle_id,
        tripId: trip.id,
        tripCode: trip.trip_id,
      });
    }

    return results;
  }

  /**
   * List active drivers assigned to a ride instance.
   */
  async listRideDrivers(rideInstanceId: string): Promise<AssignmentDTO[]> {
    const ride = await this.repo.getRideInstance(rideInstanceId);
    if (!ride) {
      throw new AppError('Ride instance not found', 404);
    }
    const assignments = await this.repo.listActiveRideDriverAssignments(rideInstanceId);
    return assignments.map(mapRideDriver);
  }

  /**
   * End a driver's active assignment on a ride instance.
   */
  async unassignRideDriver(rideInstanceId: string, driverId: string): Promise<AssignmentDTO> {
    const existing = await this.repo.getActiveRideDriverAssignment(rideInstanceId, driverId);
    if (!existing) {
      throw new AppError('Ride driver assignment not found', 404);
    }
    const ended = await this.repo.endRideDriverAssignment(rideInstanceId, driverId);
    await tripsRepository.cancelByAssignmentId(ended.id);
    await this.repo.syncRideVehicleFromAssignments(rideInstanceId);
    const trip = await tripsRepository.getByAssignmentId(ended.id);
    return {
      ...mapRideDriver(ended),
      tripId: trip?.id,
      tripCode: trip?.trip_id,
    };
  }
}

export const assignmentsService = new AssignmentsService(assignmentsRepository);
