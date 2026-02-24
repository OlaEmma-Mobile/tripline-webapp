import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type { TokenCreditRecord, TokenWalletRecord, TokenCreditStatus } from './wallet.types';

/**
 * Repository for token wallet persistence.
 */
export class WalletRepository {
  /** Find wallet by user id. */
  async findWalletByUser(userId: string): Promise<TokenWalletRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('token_wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<TokenWalletRecord>();

    if (error) {
      throw new AppError('Unable to fetch wallet', 500);
    }

    return data ?? null;
  }

  /** Upsert wallet record. */
  async upsertWallet(userId: string, balance: number): Promise<TokenWalletRecord> {
    const { data, error } = await supabaseAdmin
      .from('token_wallets')
      .upsert(
        { user_id: userId, balance, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single<TokenWalletRecord>();

    if (error || !data) {
      throw new AppError('Unable to update wallet', 500);
    }

    return data;
  }

  /** Create a token credit record. */
  async createCredit({
    userId,
    purchaseId,
    tokens,
    expiresAt,
  }: {
    userId: string;
    purchaseId: string;
    tokens: number;
    expiresAt: Date;
  }): Promise<TokenCreditRecord> {
    const { data, error } = await supabaseAdmin
      .from('token_credits')
      .insert({
        user_id: userId,
        purchase_id: purchaseId,
        tokens,
        expires_at: expiresAt.toISOString(),
        status: 'active',
      })
      .select('*')
      .single<TokenCreditRecord>();

    if (error || !data) {
      throw new AppError('Unable to create token credit', 500);
    }

    return data;
  }

  /** Get active credits for a user. */
  async listActiveCredits(userId: string): Promise<TokenCreditRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('token_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('expires_at', { ascending: true })
      .returns<TokenCreditRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch token credits', 500);
    }

    return data ?? [];
  }

  /** Mark credits as expired when past expiry. */
  async expireCredits(userId: string, now: Date): Promise<void> {
    const { error } = await supabaseAdmin
      .from('token_credits')
      .update({ status: 'expired' })
      .eq('user_id', userId)
      .eq('status', 'active')
      .lt('expires_at', now.toISOString());

    if (error) {
      throw new AppError('Unable to expire token credits', 500);
    }
  }

  /** Extend all active credits to a new expiry. */
  async extendActiveCredits(userId: string, newExpiry: Date): Promise<void> {
    const { error } = await supabaseAdmin
      .from('token_credits')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      throw new AppError('Unable to extend token credits', 500);
    }
  }

  /** Compute balance from active credits. */
  async computeActiveBalance(userId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('token_credits')
      .select('tokens')
      .eq('user_id', userId)
      .eq('status', 'active')
      .returns<{ tokens: number }[]>();

    if (error) {
      throw new AppError('Unable to compute wallet balance', 500);
    }

    const total = (data ?? []).reduce((sum, row) => sum + (row.tokens ?? 0), 0);
    return total;
  }
}

export const walletRepository = new WalletRepository();
