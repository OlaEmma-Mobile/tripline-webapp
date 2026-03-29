import type { UserRole, UserStatus, KycStatus } from '@/lib/features/auth/auth.types';

export interface UserProfileRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  email_verified_at: string | null;
  status: UserStatus;
  ride_passcode_hash: string | null;
  ride_passcode_set_at: string | null;
  ride_passcode_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserMeDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  emailVerified: boolean;
  hasRidePasscode: boolean;
  accountStatus: UserStatus;
  driverKycStatus: KycStatus | null;
  createdAt: string;
  updatedAt: string;
}
