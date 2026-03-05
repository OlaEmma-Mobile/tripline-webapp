import { z } from 'zod';

/**
 * Query validation for user notifications list endpoint.
 */
export const notificationsQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Query validation for admin notifications and deliveries list endpoints.
 */
export const adminNotificationsQuerySchema = z
  .object({
    userId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['from'],
    message: 'from date must be before or equal to to date',
  });

/**
 * Validation schema for user push token registration.
 */
export const savePushTokenSchema = z.object({
  token: z.string().trim().min(20, 'Push token is required'),
  platform: z.enum(['ios', 'android', 'web']).optional(),
  appVersion: z.string().trim().max(50).optional(),
});

/**
 * Query validation for processing outbox retries.
 */
export const processOutboxQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
});
