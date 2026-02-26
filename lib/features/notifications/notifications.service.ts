import { notificationsRepository, NotificationsRepository } from './notifications.repository';
import type { CreateNotificationInput, CreateNotificationResult } from './notifications.types';

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
}

export const notificationsService = new NotificationsService(notificationsRepository);
