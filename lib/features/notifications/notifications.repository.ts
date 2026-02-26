import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type {
  CreateNotificationInput,
  CreateNotificationResult,
  NotificationRecord,
} from './notifications.types';

/**
 * Postgres repository for notifications.
 */
export class NotificationsRepository {
  /**
   * Creates a notification with idempotency on (user_id, reference, reason) when provided.
   */
  async create(input: CreateNotificationInput): Promise<CreateNotificationResult> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: input.userId,
        type: input.type,
        message: input.message,
        reference: input.reference ?? null,
        reason: input.reason ?? null,
        metadata: input.metadata ?? {},
      })
      .select('id')
      .single<{ id: string }>();

    if (error) {
      if (error.code === '23505' && input.reference && input.reason) {
        const existing = await this.findByReferenceReason(input.userId, input.reference, input.reason);
        if (existing) return { id: existing.id, created: false };
      }
      throw new AppError('Unable to create notification', 500);
    }

    return { id: data.id, created: true };
  }

  /**
   * Finds a notification by idempotency tuple.
   */
  async findByReferenceReason(
    userId: string,
    reference: string,
    reason: string
  ): Promise<NotificationRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('reference', reference)
      .eq('reason', reason)
      .maybeSingle<NotificationRecord>();

    if (error) {
      throw new AppError('Unable to fetch notification', 500);
    }

    return data ?? null;
  }
}

export const notificationsRepository = new NotificationsRepository();
