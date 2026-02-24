import { AppError } from '@/lib/utils/errors';
import { assignmentsRepository, AssignmentsRepository } from './assignments.repository';
import type {
  AssignmentDTO,
  AssignDriverRouteInput,
  AssignDriverVehicleInput,
  DriverRouteAssignmentRecord,
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

    await this.repo.endActiveDriverVehicleByDriver(input.driverId);
    await this.repo.endActiveDriverVehicleByVehicle(input.vehicleId);

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
}

export const assignmentsService = new AssignmentsService(assignmentsRepository);
