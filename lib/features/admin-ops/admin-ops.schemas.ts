import { z } from 'zod';

export const adminBookingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  routeId: z.string().uuid().optional(),
  date: z.string().date().optional(),
  userId: z.string().uuid().optional(),
  status: z.string().trim().min(1).optional(),
});

export const adminBookingProblemSchema = z.object({
  flagged: z.boolean(),
  note: z.string().trim().max(1000).optional(),
});

export const adminBookingRefundSchema = z.object({
  amount: z.number().int().positive('Amount must be greater than 0'),
  reason: z.string().trim().min(1, 'Reason is required').max(300),
});

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().optional(),
  role: z.enum(['driver', 'rider', 'admin', 'sub_admin']).optional(),
  status: z.enum(['active', 'inactive', 'restricted']).optional(),
});

export const adminWalletAdjustSchema = z.object({
  amount: z.number().int().refine((value) => value !== 0, 'Amount must not be zero'),
  reason: z.string().trim().min(1, 'Reason is required').max(300),
  reference: z.string().trim().max(150).optional(),
});

export const adminTokensQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  status: z.enum(['pending', 'success', 'failed']).optional(),
  userId: z.string().uuid().optional(),
});

export const adminSettingsUpdateSchema = z.object({
  bookingWindowDaysAhead: z.number().int().min(1).max(365),
  cancellationWindowMinutes: z.number().int().min(0).max(24 * 60),
  tokenExpiryDays: z.number().int().min(1).max(3650),
});
