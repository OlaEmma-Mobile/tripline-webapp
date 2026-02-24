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
  accountStatus: UserStatus;
  driverKycStatus: KycStatus | null;
  createdAt: string;
  updatedAt: string;
}
