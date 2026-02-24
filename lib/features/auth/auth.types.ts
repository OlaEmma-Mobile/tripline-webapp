export type RegisterRole = 'rider' | 'driver';
export type UserRole = 'rider' | 'driver' | 'admin' | 'sub_admin';
export type UserStatus = 'active' | 'inactive' | 'restricted';
export type OtpPurpose = 'verify_email' | 'reset_password';
export type KycStatus = 'pending' | 'verified' | 'rejected';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: RegisterRole;
}

export interface VerifyOtpPayload {
  verifyToken: string;
  otp: string;
}

export interface ResendOtpPayload {
  verifyToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  newPassword: string;
  verifyToken: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface UserRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  password_hash: string;
  email_verified_at: string | null;
  status: UserStatus;
}

export interface OtpRecord {
  id: string;
  user_id: string;
  code_hash: string;
  purpose: OtpPurpose;
  expires_at: string;
  attempts: number;
  created_at: string;
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface DriverKycRecord {
  id: string;
  user_id: string;
  license_number: string;
  nin_bvn_nid: string;
  status: KycStatus;
}
