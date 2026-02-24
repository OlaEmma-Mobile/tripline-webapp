import { AppError } from '@/lib/utils/errors';
import { encryptValue } from '@/lib/security/encryption';
import { authRepository, AuthRepository } from '@/lib/features/auth/auth.repository';
import { driverKycRepository, DriverKycRepository } from './kyc.repository';

/**
 * Driver KYC service with encryption at rest.
 */
export class DriverKycService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly kycRepo: DriverKycRepository
  ) {}

  /** Create a driver KYC submission with encrypted fields. */
  async submitDriverKyc({
    email,
    licenseNumber,
    ninBvnNid,
  }: {
    email: string;
    licenseNumber: string;
    ninBvnNid: string;
  }): Promise<{ id: string }> {
    const user = await this.authRepo.findUserByEmail(email);
    if (!user || user.role !== 'driver') {
      throw new AppError('Driver not found', 404);
    }

    const encryptedLicense = encryptValue(licenseNumber);
    const encryptedNin = encryptValue(ninBvnNid);

    const record = await this.kycRepo.upsertDriverKyc({
      userId: user.id,
      licenseNumber: encryptedLicense,
      ninBvnNid: encryptedNin,
    });
    return { id: record.id };
  }
}

export const driverKycService = new DriverKycService(authRepository, driverKycRepository);
