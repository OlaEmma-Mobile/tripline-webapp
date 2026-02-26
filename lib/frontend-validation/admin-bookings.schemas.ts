import { z } from 'zod';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const adminBookingsFilterClientSchema = z.object({
  date: isoDateSchema.optional().or(z.literal('')),
  status: z.enum(['', 'booked', 'boarded', 'cancelled', 'no_show']).optional(),
  routeId: z.string().uuid('Route ID must be a valid UUID').optional(),
  userId: z.string().uuid('User ID must be a valid UUID').optional(),
});

export const adminBookingProblemActionClientSchema = z.object({
  bookingId: z.string().uuid('Booking ID must be a valid UUID'),
  flagged: z.boolean(),
  note: z.string().trim().max(500, 'Problem note is too long').optional(),
});

export const adminBookingRefundActionClientSchema = z.object({
  bookingId: z.string().uuid('Booking ID must be a valid UUID'),
  amount: z.number().int().positive('Refund amount must be greater than 0'),
  reason: z.string().trim().min(1, 'Refund reason is required').max(200, 'Refund reason is too long'),
});
