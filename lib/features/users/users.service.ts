import { AppError } from '@/lib/utils/errors';
import { usersRepository, UsersRepository } from './users.repository';
import type { UserMeDTO, UserProfileRecord } from './users.types';

/**
 * mapUserMe Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function mapUserMe(record: UserProfileRecord, driverKycStatus: 'pending' | 'verified' | 'rejected' | null): UserMeDTO {
  return {
    id: record.id,
    firstName: record.first_name,
    lastName: record.last_name,
    email: record.email,
    phone: record.phone,
    role: record.role,
    emailVerified: Boolean(record.email_verified_at),
    accountStatus: record.status,
    driverKycStatus,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * User profile service.
 */
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  /** Get authenticated user's profile and status flags. */
  async getMe(userId: string): Promise<UserMeDTO> {
    const user = await this.repo.getById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const driverKycStatus = user.role === 'driver' ? await this.repo.getDriverKycStatus(user.id) : null;
    return mapUserMe(user, driverKycStatus);
  }
}

export const usersService = new UsersService(usersRepository);
