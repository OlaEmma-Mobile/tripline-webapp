import { AppError } from '@/lib/utils/errors';
import { providersRepository } from '@/lib/features/providers/providers.repository';
import { vehiclesRepository, VehiclesRepository } from './vehicles.repository';
import type {
  AssignProviderInput,
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleDTO,
  VehicleFilters,
  VehicleRecord,
} from './vehicles.types';

/**
 * mapVehicle Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapVehicle(record: VehicleRecord): VehicleDTO {
  return {
    id: record.id,
    providerId: record.provider_id,
    registrationNumber: record.registration_number,
    model: record.model,
    capacity: record.capacity,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Vehicle business logic service.
 */
export class VehiclesService {
  constructor(private readonly repo: VehiclesRepository) {}

  /** Create a vehicle with optional provider reference validation. */
  async create(input: CreateVehicleInput): Promise<VehicleDTO> {
    if (input.providerId) {
      const provider = await providersRepository.getById(input.providerId);
      if (!provider) {
        throw new AppError('Provider not found', 404);
      }
    }

    const created = await this.repo.create(input);
    return mapVehicle(created);
  }

  /** List vehicles with pagination. */
  async list(filters: VehicleFilters): Promise<{ items: VehicleDTO[]; total: number }> {
    const { items, total } = await this.repo.list(filters);
    return { items: items.map(mapVehicle), total };
  }

  /** Get vehicle by id. */
  async getById(id: string): Promise<VehicleDTO> {
    const vehicle = await this.repo.getById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    return mapVehicle(vehicle);
  }

  /** Update vehicle with provider validation when provided. */
  async update(id: string, input: UpdateVehicleInput): Promise<VehicleDTO> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new AppError('Vehicle not found', 404);
    }

    if (input.providerId) {
      const provider = await providersRepository.getById(input.providerId);
      if (!provider) {
        throw new AppError('Provider not found', 404);
      }
    }

    const updated = await this.repo.update(id, input);
    return mapVehicle(updated);
  }

  /** Deactivate a vehicle. */
  async softDelete(id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new AppError('Vehicle not found', 404);
    }
    await this.repo.softDelete(id);
  }

  /** Assign or unassign a provider from a vehicle. */
  async assignProvider(id: string, input: AssignProviderInput): Promise<VehicleDTO> {
    const vehicle = await this.repo.getById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    if (input.providerId) {
      const provider = await providersRepository.getById(input.providerId);
      if (!provider) {
        throw new AppError('Provider not found', 404);
      }
    }

    const updated = await this.repo.update(id, { providerId: input.providerId });
    return mapVehicle(updated);
  }
}

export const vehiclesService = new VehiclesService(vehiclesRepository);
