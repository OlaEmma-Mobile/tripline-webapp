import { z } from 'zod';

export const driverKycSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address'
  }),
  licenseNumber: z.string()
    .min(10, { message: 'License number must be exactly 10 characters' })
    .max(10, { message: 'License number must be exactly 10 characters' }),
  ninBvnNid: z.string()
    .min(10, { message: 'NIN/BVN/NID must be exactly 10 characters' })
    .max(10, { message: 'NIN/BVN/NID must be exactly 10 characters' }),
});
