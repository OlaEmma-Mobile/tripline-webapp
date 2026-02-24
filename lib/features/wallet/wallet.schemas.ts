import { z } from 'zod';

export const walletQuerySchema = z.object({
  includeCredits: z.boolean().optional(),
});
