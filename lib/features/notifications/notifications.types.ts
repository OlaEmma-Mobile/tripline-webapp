/**
 * Payload for creating a persisted user notification.
 */
export interface CreateNotificationInput {
  userId: string;
  type: string;
  message: string;
  reference?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for listing current user notifications.
 */
export interface ListNotificationsInput {
  userId: string;
  page: number;
  limit: number;
  unreadOnly?: boolean;
}

/**
 * Input for admin notifications query.
 */
export interface AdminListNotificationsInput {
  page: number;
  limit: number;
  userId?: string;
  reason?: string;
  from?: string;
  to?: string;
}

/**
 * Notifications table row.
 */
export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  reference: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
}

/**
 * Delivery channel type for notification fanout.
 */
export type NotificationDeliveryChannel = 'rtdb' | 'fcm';

/**
 * Notification delivery row for channel-level status tracking.
 */
export interface NotificationDeliveryRecord {
  id: string;
  notification_id: string;
  channel: NotificationDeliveryChannel;
  status: 'pending' | 'sent' | 'failed';
  attempt_count: number;
  last_error: string | null;
  last_attempt_at: string | null;
  sent_at: string | null;
  created_at: string;
}

/**
 * Outbox row for retry scheduling.
 */
export interface NotificationOutboxRecord {
  id: string;
  notification_id: string;
  channel: NotificationDeliveryChannel;
  run_after: string;
  attempt_count: number;
  status: 'queued' | 'processing' | 'failed' | 'completed';
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Result for idempotent notification create.
 */
export interface CreateNotificationResult {
  id: string;
  created: boolean;
}

/**
 * Notification DTO exposed through APIs.
 */
export interface NotificationDTO {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  reference: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
}

/**
 * Delivery update payload.
 */
export interface UpdateDeliveryInput {
  notificationId: string;
  channel: NotificationDeliveryChannel;
  status: 'sent' | 'failed';
  errorMessage?: string;
}

/**
 * Outbox enqueue payload.
 */
export interface EnqueueOutboxInput {
  notificationId: string;
  channel: NotificationDeliveryChannel;
  errorMessage?: string;
  runAfter?: string;
}
