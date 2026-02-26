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
 * Result for idempotent notification create.
 */
export interface CreateNotificationResult {
  id: string;
  created: boolean;
}
