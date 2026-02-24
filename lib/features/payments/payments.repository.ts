import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type { TokenPurchaseRecord, TokenPurchaseStatus } from './payments.types';

/**
 * Repository for token purchase persistence.
 */
export class PaymentsRepository {
  /** Create a token purchase record. */
  async createPurchase({
    userId,
    reference,
    amountNgn,
    tokens,
  }: {
    userId: string;
    reference: string;
    amountNgn: number;
    tokens: number;
  }): Promise<TokenPurchaseRecord> {
    const { data, error } = await supabaseAdmin
      .from('token_purchases')
      .insert({
        user_id: userId,
        reference,
        amount_ngn: amountNgn,
        tokens,
        status: 'pending',
        provider: 'paystack',
      })
      .select('*')
      .single<TokenPurchaseRecord>();

    if (error || !data) {
      throw new AppError('Unable to create purchase', 500);
    }

    return data;
  }

  /** Find purchase by reference. */
  async findPurchaseByReference(reference: string): Promise<TokenPurchaseRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('token_purchases')
      .select('*')
      .eq('reference', reference)
      .maybeSingle<TokenPurchaseRecord>();

    if (error) {
      throw new AppError('Unable to fetch purchase', 500);
    }

    return data ?? null;
  }

  /** Update purchase status. */
  async updatePurchaseStatus(id: string, status: TokenPurchaseStatus): Promise<TokenPurchaseRecord> {
    const { data, error } = await supabaseAdmin
      .from('token_purchases')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single<TokenPurchaseRecord>();

    if (error || !data) {
      throw new AppError('Unable to update purchase', 500);
    }

    return data;
  }
}

export const paymentsRepository = new PaymentsRepository();
