import { getFirebaseDb, getFirebaseMessaging } from '@/lib/firebase/admin';
import { notificationsService } from '@/lib/features/notifications/notifications.service';
import { usersRepository, UsersRepository } from '@/lib/features/users/users.repository';
import { AppError } from '@/lib/utils/errors';
import { logStep } from '@/lib/utils/logger';

export type RealtimeRideStatus = 'scheduled' | 'boarding' | 'on_trip' | 'completed' | 'cancelled';

export interface CreateUserNotificationInput {
  userId: string;
  type: string;
  message: string;
  reference: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface CreateUserNotificationResult {
  notificationId: string;
  created: boolean;
}

export interface SendPushNotificationResult {
  sent: boolean;
  messageId: string | null;
}

interface NotifyUserEventInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  reference: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

interface RealtimeDependencies {
  getDb: typeof getFirebaseDb;
  getMessaging: typeof getFirebaseMessaging;
}

function toPushData(metadata?: Record<string, unknown>): Record<string, string> {
  if (!metadata) return {};
  return Object.entries(metadata).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === null || value === undefined) return acc;
    acc[key] = typeof value === 'string' ? value : String(value);
    return acc;
  }, {});
}

/**
 * Realtime + push integration service.
 */
export class RealtimeService {
  constructor(
    private readonly userRepo: UsersRepository,
    private readonly deps: RealtimeDependencies = {
      getDb: getFirebaseDb,
      getMessaging: getFirebaseMessaging,
    }
  ) {}

  /**
   * Updates ride realtime status under Firebase RTDB.
   */
  async updateRideStatus(rideInstanceId: string, status: RealtimeRideStatus): Promise<void> {
    await this.deps.getDb().ref(`realtime/rides/${rideInstanceId}/status`).set(status);
  }

  /**
   * Deletes the ride realtime node when a ride is permanently removed.
   */
  async deleteRideState(rideInstanceId: string): Promise<void> {
    await this.deps.getDb().ref(`realtime/rides/${rideInstanceId}`).set(null);
  }

  /**
   * Updates ride location + driver online state under Firebase RTDB.
   */
  async updateDriverLocation(
    rideInstanceId: string,
    lat: number,
    lng: number,
    driverOnline = true
  ): Promise<void> {
    const rideRef = this.deps.getDb().ref(`realtime/rides/${rideInstanceId}`);
    await rideRef.child('driverOnline').set(driverOnline);
    await rideRef.child('location').set({ lat, lng });
  }

  /**
   * Creates idempotent user notification in Firebase RTDB.
   */
  async createUserNotification(
    input: CreateUserNotificationInput
  ): Promise<CreateUserNotificationResult> {
    const notificationId = `${input.reference}_${input.reason}`.replace(/\s+/g, '_');
    const ref = this.deps.getDb().ref(`realtime/notifications/${input.userId}/${notificationId}`);
    const snapshot = await ref.get();

    if (snapshot.exists()) {
      return { notificationId, created: false };
    }

    await ref.set({
      type: input.type,
      message: input.message,
      read: false,
      created_at: Date.now(),
      reference: input.reference,
      reason: input.reason,
      metadata: input.metadata ?? {},
    });

    return { notificationId, created: true };
  }

  /**
   * Sends push notification to user fcm token if available.
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<SendPushNotificationResult> {
    const token = await this.userRepo.getFcmToken(userId);
    if (!token) {
      return { sent: false, messageId: null };
    }

    try {
      const messageId = await this.deps.getMessaging().send({
        token,
        notification: { title, body },
        data,
      });
      return { sent: true, messageId };
    } catch (error) {
      const message = String((error as Error)?.message ?? '');
      if (
        message.includes('registration-token-not-registered') ||
        message.includes('invalid-registration-token')
      ) {
        await this.userRepo.clearFcmToken(userId);
      }
      throw new AppError('Unable to send push notification', 500);
    }
  }

  /**
   * Creates realtime notification and push for booking lifecycle changes.
   */
  async notifyBookingStatusChange(input: {
    userId: string;
    bookingId: string;
    status: 'boarded' | 'cancelled' | 'no_show';
  }): Promise<void> {
    const payloadMap: Record<
      'boarded' | 'cancelled' | 'no_show',
      { reason: string; type: string; title: string; message: string }
    > = {
      boarded: {
        reason: 'RIDE_BOARDED',
        type: 'booking_status',
        title: 'Ride update',
        message: 'You have been marked as boarded.',
      },
      cancelled: {
        reason: 'BOOKING_CANCELLED',
        type: 'booking_status',
        title: 'Booking cancelled',
        message: 'Your booking has been cancelled.',
      },
      no_show: {
        reason: 'NO_SHOW_TOKEN_CONSUMED',
        type: 'booking_status',
        title: 'Ride update',
        message: 'You were marked as no-show. Tokens are consumed.',
      },
    };

    const payload = payloadMap[input.status];
    await this.notifyUserEvent({
      userId: input.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      reference: input.bookingId,
      reason: payload.reason,
    });
  }

  /**
   * Persists notification and performs RTDB + FCM fanout with delivery tracking.
   */
  async notifyUserEvent(input: NotifyUserEventInput): Promise<void> {
    const created = await notificationsService.createNotificationAndQueueDelivery({
      userId: input.userId,
      type: input.type,
      message: input.message,
      reference: input.reference,
      reason: input.reason,
      metadata: input.metadata,
    });

    try {
      await this.createUserNotification({
        userId: input.userId,
        type: input.type,
        message: input.message,
        reference: input.reference,
        reason: input.reason,
        metadata: input.metadata,
      });
      await notificationsService.markDeliveryStatus({
        notificationId: created.id,
        channel: 'rtdb',
        status: 'sent',
      });
    } catch {
      await notificationsService.markDeliveryStatus({
        notificationId: created.id,
        channel: 'rtdb',
        status: 'failed',
        errorMessage: 'RTDB_MIRROR_FAILED',
      });
      await notificationsService.enqueueDeliveryRetry({
        notificationId: created.id,
        channel: 'rtdb',
        errorMessage: 'RTDB_MIRROR_FAILED',
      });
      logStep('firebase notification mirror failed', {
        userId: input.userId,
        reference: input.reference,
        reason: input.reason,
      });
    }

    try {
      const pushData = {
        reference: input.reference,
        reason: input.reason,
        ...toPushData(input.metadata),
      };
      const push = await this.sendPushNotification(input.userId, input.title, input.message, {
        ...pushData,
      });
      if (!push.sent) {
        await notificationsService.markDeliveryStatus({
          notificationId: created.id,
          channel: 'fcm',
          status: 'failed',
          errorMessage: 'FCM_TOKEN_MISSING',
        });
        return;
      }
      await notificationsService.markDeliveryStatus({
        notificationId: created.id,
        channel: 'fcm',
        status: 'sent',
      });
    } catch {
      await notificationsService.markDeliveryStatus({
        notificationId: created.id,
        channel: 'fcm',
        status: 'failed',
        errorMessage: 'FCM_PUSH_FAILED',
      });
      await notificationsService.enqueueDeliveryRetry({
        notificationId: created.id,
        channel: 'fcm',
        errorMessage: 'FCM_PUSH_FAILED',
      });
      logStep('push notification failed', {
        userId: input.userId,
        reference: input.reference,
        reason: input.reason,
      });
    }
  }

  /**
   * Processes queued notification outbox jobs.
   * This method is designed for cron/admin-triggered retries.
   */
  async processOutbox(limit = 50): Promise<{ processed: number; succeeded: number; failed: number }> {
    const jobs = await notificationsService.dequeueOutbox(limit);
    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        const notification = await notificationsService.getRecordById(job.notification_id);
        if (!notification) {
          throw new AppError('Notification not found', 404);
        }

        if (job.channel === 'rtdb') {
          await this.createUserNotification({
            userId: notification.user_id,
            type: notification.type,
            message: notification.message,
            reference: notification.reference ?? notification.id,
            reason: notification.reason ?? 'GENERAL',
            metadata: (notification.metadata as Record<string, unknown> | null) ?? {},
          });
          await notificationsService.markDeliveryStatus({
            notificationId: notification.id,
            channel: 'rtdb',
            status: 'sent',
          });
        } else {
          const push = await this.sendPushNotification(
            notification.user_id,
            'Tripline update',
            notification.message,
            {
              notificationId: notification.id,
              reason: notification.reason ?? 'GENERAL',
            }
          );
          if (!push.sent) {
            await notificationsService.markDeliveryStatus({
              notificationId: notification.id,
              channel: 'fcm',
              status: 'failed',
              errorMessage: 'FCM_TOKEN_MISSING',
            });
            await notificationsService.markOutboxCompleted(job.id);
            succeeded += 1;
            continue;
          }
          await notificationsService.markDeliveryStatus({
            notificationId: notification.id,
            channel: 'fcm',
            status: 'sent',
          });
        }

        await notificationsService.markOutboxCompleted(job.id);
        succeeded += 1;
      } catch (error) {
        await notificationsService.markOutboxFailed(
          job.id,
          error instanceof Error ? error.message : 'UNKNOWN_OUTBOX_ERROR'
        );
        failed += 1;
      }
    }

    return {
      processed: jobs.length,
      succeeded,
      failed,
    };
  }
}

export const realtimeService = new RealtimeService(usersRepository);
