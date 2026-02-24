import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  amountNgn: z
    .number({ required_error: 'Amount is required' })
    .int({ message: 'Amount must be an integer' })
    .min(100, { message: 'Minimum amount is ₦100' })
    .refine((value) => value % 10 === 0, { message: 'Amount must be a multiple of ₦10' }),
});
