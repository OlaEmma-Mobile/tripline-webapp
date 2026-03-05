import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type {
  AdminListNotificationsInput,
  CreateNotificationInput,
  CreateNotificationResult,
  EnqueueOutboxInput,
  ListNotificationsInput,
  NotificationDeliveryRecord,
  NotificationOutboxRecord,
  NotificationRecord,
  UpdateDeliveryInput,
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
   * Lists notifications for the current user.
   */
  async listByUser(input: ListNotificationsInput): Promise<{ items: NotificationRecord[]; total: number }> {
    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', input.userId);

    if (input.unreadOnly) {
      query = query.eq('is_read', false);
    }

    const from = (input.page - 1) * input.limit;
    const to = from + input.limit - 1;
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
      .returns<NotificationRecord[]>();

    if (error) {
      throw new AppError('Unable to list notifications', 500);
    }

    return { items: data ?? [], total: count ?? 0 };
  }

  /**
   * Lists notifications for admin audit use-cases.
   */
  async adminList(input: AdminListNotificationsInput): Promise<{ items: NotificationRecord[]; total: number }> {
    let query = supabaseAdmin.from('notifications').select('*', { count: 'exact' });

    if (input.userId) query = query.eq('user_id', input.userId);
    if (input.reason) query = query.eq('reason', input.reason);
    if (input.from) query = query.gte('created_at', `${input.from}T00:00:00.000Z`);
    if (input.to) query = query.lte('created_at', `${input.to}T23:59:59.999Z`);

    const from = (input.page - 1) * input.limit;
    const to = from + input.limit - 1;
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
      .returns<NotificationRecord[]>();

    if (error) {
      throw new AppError('Unable to list notifications', 500);
    }

    return { items: data ?? [], total: count ?? 0 };
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

  /**
   * Finds a notification by id.
   */
  async findById(id: string): Promise<NotificationRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', id)
      .maybeSingle<NotificationRecord>();

    if (error) {
      throw new AppError('Unable to fetch notification', 500);
    }

    return data ?? null;
  }

  /**
   * Marks one notification as read for a user.
   */
  async markRead(notificationId: string, userId: string): Promise<NotificationRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle<NotificationRecord>();

    if (error) {
      throw new AppError('Unable to mark notification as read', 500);
    }

    return data ?? null;
  }

  /**
   * Marks all unread notifications as read for a user.
   */
  async markAllRead(userId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('id')
      .returns<Array<{ id: string }>>();

    if (error) {
      throw new AppError('Unable to mark all notifications as read', 500);
    }

    return (data ?? []).length;
  }

  /**
   * Creates pending delivery rows for all channels when notification is first created.
   */
  async ensureDeliveryRows(notificationId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('notification_deliveries').upsert(
      [
        { notification_id: notificationId, channel: 'rtdb', status: 'pending' },
        { notification_id: notificationId, channel: 'fcm', status: 'pending' },
      ],
      { onConflict: 'notification_id,channel' }
    );

    if (error) {
      throw new AppError('Unable to create notification delivery rows', 500);
    }
  }

  /**
   * Updates channel delivery status.
   */
  async updateDeliveryStatus(input: UpdateDeliveryInput): Promise<void> {
    const payload: Record<string, unknown> = {
      status: input.status,
      last_attempt_at: new Date().toISOString(),
      attempt_count: undefined,
      last_error: input.errorMessage ?? null,
    };

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('notification_deliveries')
      .select('attempt_count')
      .eq('notification_id', input.notificationId)
      .eq('channel', input.channel)
      .maybeSingle<{ attempt_count: number }>();

    if (fetchError) {
      throw new AppError('Unable to update notification delivery status', 500);
    }

    payload.attempt_count = (existing?.attempt_count ?? 0) + 1;
    if (input.status === 'sent') {
      payload.sent_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from('notification_deliveries')
      .upsert(
        {
          notification_id: input.notificationId,
          channel: input.channel,
          ...payload,
        },
        { onConflict: 'notification_id,channel' }
      );

    if (error) {
      throw new AppError('Unable to update notification delivery status', 500);
    }
  }

  /**
   * Enqueues a channel retry task in outbox if not already queued/processing.
   */
  async enqueueOutbox(input: EnqueueOutboxInput): Promise<void> {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('notification_outbox')
      .select('id')
      .eq('notification_id', input.notificationId)
      .eq('channel', input.channel)
      .in('status', ['queued', 'processing'])
      .limit(1)
      .returns<Array<{ id: string }>>();

    if (existingError) {
      throw new AppError('Unable to enqueue notification retry', 500);
    }

    if ((existing ?? []).length > 0) return;

    const { error } = await supabaseAdmin.from('notification_outbox').insert({
      notification_id: input.notificationId,
      channel: input.channel,
      status: 'queued',
      run_after: input.runAfter ?? new Date().toISOString(),
      last_error: input.errorMessage ?? null,
    });

    if (error) {
      throw new AppError('Unable to enqueue notification retry', 500);
    }
  }

  /**
   * Lists delivery records for admin troubleshooting.
   */
  async listDeliveries(input: AdminListNotificationsInput): Promise<{ items: NotificationDeliveryRecord[]; total: number }> {
    let query = supabaseAdmin
      .from('notification_deliveries')
      .select('*', { count: 'exact' });

    if (input.userId || input.reason || input.from || input.to) {
      let notificationsQuery = supabaseAdmin.from('notifications').select('id');
      if (input.userId) notificationsQuery = notificationsQuery.eq('user_id', input.userId);
      if (input.reason) notificationsQuery = notificationsQuery.eq('reason', input.reason);
      if (input.from) notificationsQuery = notificationsQuery.gte('created_at', `${input.from}T00:00:00.000Z`);
      if (input.to) notificationsQuery = notificationsQuery.lte('created_at', `${input.to}T23:59:59.999Z`);
      const { data: filteredNotifications, error: notifError } = await notificationsQuery
        .returns<Array<{ id: string }>>();

      if (notifError) {
        throw new AppError('Unable to list notification deliveries', 500);
      }

      const ids = (filteredNotifications ?? []).map((row) => row.id);
      if (ids.length === 0) return { items: [], total: 0 };
      query = query.in('notification_id', ids);
    }

    const from = (input.page - 1) * input.limit;
    const to = from + input.limit - 1;
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
      .returns<NotificationDeliveryRecord[]>();

    if (error) {
      throw new AppError('Unable to list notification deliveries', 500);
    }

    return { items: data ?? [], total: count ?? 0 };
  }

  /**
   * Picks queued outbox rows and marks them processing.
   */
  async dequeueOutbox(limit: number): Promise<NotificationOutboxRecord[]> {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('notification_outbox')
      .select('*')
      .eq('status', 'queued')
      .lte('run_after', nowIso)
      .order('run_after', { ascending: true })
      .limit(limit)
      .returns<NotificationOutboxRecord[]>();

    if (error) {
      throw new AppError('Unable to fetch notification outbox', 500);
    }

    const rows = data ?? [];
    for (const row of rows) {
      await supabaseAdmin
        .from('notification_outbox')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('status', 'queued');
    }

    return rows;
  }

  /**
   * Marks outbox row as completed.
   */
  async markOutboxCompleted(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notification_outbox')
      .update({ status: 'completed', updated_at: new Date().toISOString(), last_error: null })
      .eq('id', id);
    if (error) {
      throw new AppError('Unable to complete notification outbox row', 500);
    }
  }

  /**
   * Marks outbox row as failed/queued with backoff metadata.
   */
  async markOutboxFailed(id: string, errorMessage: string, nextRunAfterIso?: string): Promise<void> {
    const { data: row, error: fetchError } = await supabaseAdmin
      .from('notification_outbox')
      .select('attempt_count')
      .eq('id', id)
      .maybeSingle<{ attempt_count: number }>();

    if (fetchError) {
      throw new AppError('Unable to update notification outbox row', 500);
    }

    const attempts = (row?.attempt_count ?? 0) + 1;
    const status = attempts >= 8 ? 'failed' : 'queued';
    const runAfter =
      nextRunAfterIso ??
      new Date(Date.now() + Math.min(60_000 * attempts, 15 * 60_000)).toISOString();
    const { error } = await supabaseAdmin
      .from('notification_outbox')
      .update({
        status,
        attempt_count: attempts,
        last_error: errorMessage,
        run_after: runAfter,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new AppError('Unable to update notification outbox row', 500);
    }
  }
}

export const notificationsRepository = new NotificationsRepository();
