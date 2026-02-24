import { z } from 'zod';

export const providerStatusSchema = z.enum(['active', 'inactive']);

const baseProviderSchema = z.object({
  name: z.string().trim().min(1, 'Provider name is required'),
  contactName: z.string().trim().min(1, 'Contact name is required').optional(),
  contactEmail: z.string().trim().email('Valid contact email is required').optional(),
  contactPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, 'Contact phone must be a valid phone number')
    .optional(),
  status: providerStatusSchema.optional(),
});

export const createProviderSchema = baseProviderSchema;
export const updateProviderSchema = baseProviderSchema.partial();

export const providerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: providerStatusSchema.optional(),
  q: z.string().trim().optional(),
});
