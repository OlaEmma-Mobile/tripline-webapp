import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type { DriverKycRecord, OtpPurpose, OtpRecord, RefreshTokenRecord, UserRecord, UserRole } from './auth.types';

/**
 * Repository for auth-related persistence via Supabase.
 */
export class AuthRepository {
  /** Persist a new user record. */
  async createUser({
    firstName,
    lastName,
    email,
    phone,
    role,
    passwordHash,
  }: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: UserRole;
    passwordHash: string;
  }): Promise<UserRecord> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone ?? null,
        role,
        password_hash: passwordHash,
      })
      .select('*')
      .single<UserRecord>();

    if (error || !data) {
      throw new AppError('Unable to create user', 500);
    }
    return data;
  }

  /** Find a user by email. */
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle<UserRecord>();

    if (error) {
      throw new AppError('Unable to fetch user', 500);
    }
    return data ?? null;
  }

  /** Find a user by id. */
  async findUserById(userId: string): Promise<UserRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle<UserRecord>();

    if (error) {
      throw new AppError('Unable to fetch user', 500);
    }

    return data ?? null;
  }

  /** Find a user by email including KYC. */
  async findUserByEmailWithKyc(email: string): Promise<(UserRecord & { kyc: DriverKycRecord | null }) | null> {
    const user = await this.findUserByEmail(email);
    if (!user) return null;

    const { data, error } = await supabaseAdmin
      .from('driver_kyc')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle<DriverKycRecord>();

    if (error) {
      throw new AppError('Unable to fetch KYC', 500);
    }

    return { ...user, kyc: data ?? null };
  }

  /** Mark user email as verified. */
  async markEmailVerified(userId: string): Promise<UserRecord> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ email_verified_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single<UserRecord>();

    if (error || !data) {
      throw new AppError('Unable to verify email', 500);
    }
    return data;
  }

  /** Store an OTP hash. */
  async createOtp({
    userId,
    codeHash,
    purpose,
    expiresAt,
  }: {
    userId: string;
    codeHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }): Promise<OtpRecord> {
    const { data, error } = await supabaseAdmin
      .from('otps')
      .insert({
        user_id: userId,
        code_hash: codeHash,
        purpose,
        expires_at: expiresAt.toISOString(),
      })
      .select('*')
      .single<OtpRecord>();

    if (error || !data) {
      throw new AppError('Unable to create OTP', 500);
    }
    return data;
  }

  /** Find latest OTP for user/purpose. */
  async findLatestOtp(userId: string, purpose: OtpPurpose): Promise<OtpRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('otps')
      .select('*')
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<OtpRecord>();

    if (error) {
      throw new AppError('Unable to fetch OTP', 500);
    }
    return data ?? null;
  }

  /** Increment OTP attempts. */
  async incrementOtpAttempts(otpId: string): Promise<void> {
    const { data, error: fetchError } = await supabaseAdmin
      .from('otps')
      .select('attempts')
      .eq('id', otpId)
      .single<{ attempts: number }>();
    if (fetchError) {
      throw new AppError('Unable to update OTP attempts', 500);
    }
    const { error } = await supabaseAdmin
      .from('otps')
      .update({ attempts: (data?.attempts ?? 0) + 1 })
      .eq('id', otpId);
    if (error) {
      throw new AppError('Unable to update OTP attempts', 500);
    }
  }

  /** Delete OTP after successful verification. */
  async deleteOtp(otpId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('otps').delete().eq('id', otpId);
    if (error) {
      throw new AppError('Unable to delete OTP', 500);
    }
  }

  /** Update user password hash. */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    if (error) {
      throw new AppError('Unable to update password', 500);
    }
  }

  /** Update user account status. */
  async updateUserStatus(
    userId: string,
    status: 'active' | 'inactive' | 'restricted'
  ): Promise<void> {
    const { error } = await supabaseAdmin.from('users').update({ status }).eq('id', userId);
    if (error) {
      throw new AppError('Unable to update user status', 500);
    }
  }

  /** Store a refresh token hash. */
  async createRefreshToken({
    userId,
    tokenHash,
    expiresAt,
  }: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    const { data, error } = await supabaseAdmin
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })
      .select('*')
      .single<RefreshTokenRecord>();

    if (error || !data) {
      throw new AppError('Unable to create refresh token', 500);
    }
    return data;
  }

  /** Find refresh token by hash. */
  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<RefreshTokenRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch refresh token', 500);
    }
    return data?.[0] ?? null;
  }

  /** Revoke a refresh token. */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId);

    if (error) {
      throw new AppError('Unable to revoke refresh token', 500);
    }
  }
}

export const authRepository = new AuthRepository();
