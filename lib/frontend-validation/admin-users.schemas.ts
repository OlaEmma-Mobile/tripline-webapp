import { z } from 'zod';

export const adminUserSelectionClientSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
});

export const adminWalletAdjustmentClientSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  amount: z
    .number()
    .int('Wallet adjustment must be an integer')
    .refine((value) => value !== 0, 'Wallet adjustment cannot be zero'),
  reason: z.string().trim().min(1, 'Adjustment reason is required').max(200, 'Adjustment reason is too long'),
});
