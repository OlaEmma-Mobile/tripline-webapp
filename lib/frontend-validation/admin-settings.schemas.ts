import { z } from 'zod';

export const adminSettingsClientSchema = z.object({
  bookingWindowDaysAhead: z.number().int().positive('Booking window must be greater than 0'),
  cancellationWindowMinutes: z.number().int().nonnegative('Cancellation window cannot be negative'),
  tokenExpiryDays: z.number().int().positive('Token expiry must be greater than 0'),
});
