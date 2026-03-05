import { notificationsRepository, NotificationsRepository } from './notifications.repository';
import { AppError } from '@/lib/utils/errors';
import type {
  AdminListNotificationsInput,
  CreateNotificationInput,
  CreateNotificationResult,
  ListNotificationsInput,
  NotificationDTO,
  NotificationRecord,
  NotificationOutboxRecord,
} from './notifications.types';

function mapNotification(record: {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  reference: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
}): NotificationDTO {
  return {
    id: record.id,
    type: record.type,
    message: record.message,
    isRead: record.is_read,
    reference: record.reference,
    reason: record.reason,
    metadata: record.metadata,
    createdAt: record.created_at,
    readAt: record.read_at,
  };
}

/**
 * Notification application service.
 */
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  /**
   * Creates a persisted notification with repository-level idempotency handling.
   */
  async createNotification(input: CreateNotificationInput): Promise<CreateNotificationResult> {
    return this.repo.create(input);
  }

  /**
   * Creates persisted notification and prepares channel delivery tracking.
   */
  async createNotificationAndQueueDelivery(input: CreateNotificationInput): Promise<CreateNotificationResult> {
    const created = await this.repo.create(input);
    try {
      await this.repo.ensureDeliveryRows(created.id);
    } catch (error) {
      throw new AppError(
        error instanceof Error ? error.message : 'Unable to create notification delivery rows',
        500
      );
    }
    return created;
  }

  /**
   * Lists notifications for a specific user.
   */
  async listUserNotifications(input: ListNotificationsInput): Promise<{ items: NotificationDTO[]; total: number }> {
    const { items, total } = await this.repo.listByUser(input);
    return { items: items.map(mapNotification), total };
  }

  /**
   * Lists notifications for admin operational audit.
   */
  async listAdminNotifications(
    input: AdminListNotificationsInput
  ): Promise<{ items: NotificationDTO[]; total: number }> {
    const { items, total } = await this.repo.adminList(input);
    return { items: items.map(mapNotification), total };
  }

  /**
   * Marks a user notification as read.
   */
  async markRead(notificationId: string, userId: string): Promise<NotificationDTO> {
    const row = await this.repo.markRead(notificationId, userId);
    if (!row) {
      throw new AppError('Notification not found', 404);
    }
    return mapNotification(row);
  }

  /**
   * Marks all unread notifications as read for user.
   */
  async markAllRead(userId: string): Promise<{ count: number }> {
    const count = await this.repo.markAllRead(userId);
    return { count };
  }

  /**
   * Returns raw notification record for internal delivery workers.
   */
  async getRecordById(notificationId: string): Promise<NotificationRecord | null> {
    return this.repo.findById(notificationId);
  }

  /**
   * Marks delivery status for a notification channel.
   */
  async markDeliveryStatus(input: {
    notificationId: string;
    channel: 'rtdb' | 'fcm';
    status: 'sent' | 'failed';
    errorMessage?: string;
  }): Promise<void> {
    await this.repo.updateDeliveryStatus(input);
  }

  /**
   * Enqueues notification outbox retry.
   */
  async enqueueDeliveryRetry(input: {
    notificationId: string;
    channel: 'rtdb' | 'fcm';
    errorMessage?: string;
  }): Promise<void> {
    await this.repo.enqueueOutbox(input);
  }

  /**
   * Lists delivery attempts for admin diagnostics.
   */
  async listDeliveryAttempts(input: AdminListNotificationsInput): Promise<{ items: unknown[]; total: number }> {
    return this.repo.listDeliveries(input);
  }

  /**
   * Pulls queued outbox jobs for retry workers.
   */
  async dequeueOutbox(limit: number): Promise<NotificationOutboxRecord[]> {
    return this.repo.dequeueOutbox(limit);
  }

  /**
   * Marks outbox job completed.
   */
  async markOutboxCompleted(id: string): Promise<void> {
    await this.repo.markOutboxCompleted(id);
  }

  /**
   * Marks outbox job failed with retry backoff.
   */
  async markOutboxFailed(id: string, errorMessage: string): Promise<void> {
    await this.repo.markOutboxFailed(id, errorMessage);
  }
}

export const notificationsService = new NotificationsService(notificationsRepository);
