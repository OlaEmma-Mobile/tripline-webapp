import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type { KycStatus } from '@/lib/features/auth/auth.types';
import type { UserProfileRecord } from './users.types';

/**
 * Users read-model repository.
 */
export class UsersRepository {
  private isRidePasscodeSchemaMissing(error: { message?: string; details?: string; hint?: string; code?: string } | null): boolean {
    const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
    return (
      text.includes('ride_passcode_hash') ||
      text.includes('ride_passcode_set_at') ||
      text.includes('ride_passcode_updated_at') ||
      error?.code === '42703'
    );
  }

  /** Find user profile by id. */
  async getById(userId: string): Promise<UserProfileRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, phone, role, email_verified_at, status, ride_passcode_hash, ride_passcode_set_at, ride_passcode_updated_at, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle<UserProfileRecord>();

    if (error && this.isRidePasscodeSchemaMissing(error)) {
      const fallback = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email, phone, role, email_verified_at, status, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle<
          Omit<UserProfileRecord, 'ride_passcode_hash' | 'ride_passcode_set_at' | 'ride_passcode_updated_at'>
        >();

      if (fallback.error) {
        throw new AppError('Unable to fetch user profile', 500);
      }

      return fallback.data
        ? {
            ...fallback.data,
            ride_passcode_hash: null,
            ride_passcode_set_at: null,
            ride_passcode_updated_at: null,
          }
        : null;
    }

    if (error) {
      throw new AppError('Unable to fetch user profile', 500);
    }

    return data ?? null;
  }

  /** Persist a hashed rider passcode. */
  async updateRidePasscode(userId: string, passcodeHash: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        ride_passcode_hash: passcodeHash,
        ride_passcode_set_at: now,
        ride_passcode_updated_at: now,
      })
      .eq('id', userId);

    if (error && this.isRidePasscodeSchemaMissing(error)) {
      throw new AppError('Ride passcode schema not migrated', 409);
    }

    if (error) {
      throw new AppError('Unable to save ride passcode', 500);
    }
  }

  /** Get driver KYC status by user id, if present. */
  async getDriverKycStatus(userId: string): Promise<KycStatus | null> {
    const { data, error } = await supabaseAdmin
      .from('driver_kyc')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle<{ status: KycStatus }>();

    if (error) {
      throw new AppError('Unable to fetch driver KYC status', 500);
    }

    return data?.status ?? null;
  }

  /** Get a user's current FCM token. */
  async getFcmToken(userId: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('fcm_token')
      .eq('id', userId)
      .maybeSingle<{ fcm_token: string | null }>();

    if (error) {
      throw new AppError('Unable to fetch fcm token', 500);
    }

    return data?.fcm_token ?? null;
  }

  /** Clear a user's invalid FCM token. */
  async clearFcmToken(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ fcm_token: null })
      .eq('id', userId);

    if (error) {
      throw new AppError('Unable to clear fcm token', 500);
    }
  }

  /** Upserts a user's FCM token + metadata. */
  async setFcmToken(
    userId: string,
    input: { token: string; platform?: 'ios' | 'android' | 'web' }
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        fcm_token: input.token,
        fcm_token_platform: input.platform ?? null,
        fcm_token_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new AppError('Unable to save fcm token', 500);
    }
  }
}

export const usersRepository = new UsersRepository();
