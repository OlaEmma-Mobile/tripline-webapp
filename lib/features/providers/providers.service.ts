import { AppError } from '@/lib/utils/errors';
import { providersRepository, ProvidersRepository } from './providers.repository';
import type {
  CreateProviderInput,
  ProviderDTO,
  ProviderFilters,
  ProviderRecord,
  UpdateProviderInput,
} from './providers.types';

/**
 * mapProvider Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapProvider(record: ProviderRecord): ProviderDTO {
  return {
    id: record.id,
    name: record.name,
    contactName: record.contact_name,
    contactEmail: record.contact_email,
    contactPhone: record.contact_phone,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Provider business logic service.
 */
export class ProvidersService {
  constructor(private readonly repo: ProvidersRepository) {}

  /** Create provider and return DTO. */
  async create(input: CreateProviderInput): Promise<ProviderDTO> {
    const created = await this.repo.create(input);
    return mapProvider(created);
  }

  /** List providers with pagination. */
  async list(filters: ProviderFilters): Promise<{ items: ProviderDTO[]; total: number }> {
    const { items, total } = await this.repo.list(filters);
    return { items: items.map(mapProvider), total };
  }

  /** Get provider details by id. */
  async getById(id: string): Promise<ProviderDTO> {
    const provider = await this.repo.getById(id);
    if (!provider) {
      throw new AppError('Provider not found', 404);
    }
    return mapProvider(provider);
  }

  /** Update provider record. */
  async update(id: string, input: UpdateProviderInput): Promise<ProviderDTO> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new AppError('Provider not found', 404);
    }

    const updated = await this.repo.update(id, input);
    return mapProvider(updated);
  }

  /** Soft delete provider record. */
  async softDelete(id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new AppError('Provider not found', 404);
    }
    await this.repo.softDelete(id);
  }
}

export const providersService = new ProvidersService(providersRepository);
