import { z } from 'zod';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const adminTokensFilterClientSchema = z
  .object({
    from: isoDateSchema.optional().or(z.literal('')),
    to: isoDateSchema.optional().or(z.literal('')),
    status: z.enum(['', 'pending', 'success', 'failed']).optional(),
    userId: z.string().uuid('User ID must be a valid UUID').optional(),
  })
  .refine(
    (value) => {
      if (!value.from || !value.to) return true;
      return value.from <= value.to;
    },
    { message: 'From date cannot be after To date', path: ['to'] }
  );

export const adminDashboardDateClientSchema = z.object({
  selectedDate: isoDateSchema,
});
