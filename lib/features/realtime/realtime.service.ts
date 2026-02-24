import { getFirebaseDb, getFirebaseMessaging } from '@/lib/firebase/admin';
import { usersRepository, UsersRepository } from '@/lib/features/users/users.repository';
import { AppError } from '@/lib/utils/errors';

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

interface RealtimeDependencies {
  getDb: typeof getFirebaseDb;
  getMessaging: typeof getFirebaseMessaging;
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
    await this.createUserNotification({
      userId: input.userId,
      type: payload.type,
      message: payload.message,
      reference: input.bookingId,
      reason: payload.reason,
    });

    await this.sendPushNotification(input.userId, payload.title, payload.message, {
      bookingId: input.bookingId,
      status: input.status,
      reason: payload.reason,
    });
  }
}

export const realtimeService = new RealtimeService(usersRepository);
