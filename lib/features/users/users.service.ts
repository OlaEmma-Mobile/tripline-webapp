import { AppError } from '@/lib/utils/errors';
import { hashRidePasscode, verifyRidePasscode } from '@/lib/security/passcode';
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
    hasRidePasscode: Boolean(record.ride_passcode_hash),
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

  /** Set first rider ride passcode after email verification. */
  async setupRidePasscode(userId: string, passcode: string): Promise<{ success: boolean }> {
    const user = await this.repo.getById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.role !== 'rider') throw new AppError('Only riders can manage ride passcode', 403);
    if (!user.email_verified_at) throw new AppError('Email must be verified before setting ride passcode', 409);
    if (user.ride_passcode_hash) throw new AppError('Ride passcode already set', 409);

    const passcodeHash = await hashRidePasscode(passcode);
    await this.repo.updateRidePasscode(userId, passcodeHash);
    return { success: true };
  }

  /** Change rider ride passcode using the current passcode. */
  async changeRidePasscode(
    userId: string,
    input: { currentPasscode: string; newPasscode: string }
  ): Promise<{ success: boolean }> {
    const user = await this.repo.getById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.role !== 'rider') throw new AppError('Only riders can manage ride passcode', 403);
    if (!user.email_verified_at) throw new AppError('Email must be verified before changing ride passcode', 409);
    if (!user.ride_passcode_hash) throw new AppError('Ride passcode is not set', 409);

    const isValid = await verifyRidePasscode(user.ride_passcode_hash, input.currentPasscode);
    if (!isValid) throw new AppError('Current ride passcode is incorrect', 401);

    const passcodeHash = await hashRidePasscode(input.newPasscode);
    await this.repo.updateRidePasscode(userId, passcodeHash);
    return { success: true };
  }
}

export const usersService = new UsersService(usersRepository);
