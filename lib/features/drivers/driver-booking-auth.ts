import { AppError } from '@/lib/utils/errors';

/**
 * Valid boarding statuses accepted from API clients.
 */
const BOARDING_STATUS_MAP: Record<string, 'boarded' | 'no_show'> = {
  BOARDED: 'boarded',
  NO_SHOW: 'no_show',
  boarded: 'boarded',
  no_show: 'no_show',
};

/**
 * Enforces that a driver can only access their own driver-scoped route resources.
 * @param authUserId Authenticated user id from JWT.
 * @param pathDriverId Driver id from dynamic route segment.
 * @throws AppError 403 when ids do not match.
 */
export function assertDriverOwnsPathUser(authUserId: string, pathDriverId: string): void {
  if (authUserId !== pathDriverId) {
    throw new AppError('Forbidden', 403);
  }
}

/**
 * Normalizes incoming boarding status values to canonical DB values.
 * @param input Raw request status.
 * @returns Canonical lowercase booking status.
 * @throws AppError 400 when status value is unsupported.
 */
export function normalizeBoardingStatus(input: string): 'boarded' | 'no_show' {
  const normalized = BOARDING_STATUS_MAP[input];
  if (!normalized) {
    throw new AppError('Invalid boarding status', 400);
  }
  return normalized;
}

/**
 * Indicates whether a booking status should appear in driver manifest and be boardable.
 * @param status Booking status string.
 * @returns True when status is manifest-eligible.
 */
export function isManifestPassengerStatus(status: string): boolean {
  return ['booked', 'confirmed', 'boarded', 'no_show'].includes(status);
}
