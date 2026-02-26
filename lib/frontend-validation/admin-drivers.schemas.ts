import { z } from 'zod';

const optionalPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number')
  .optional()
  .or(z.literal(''));

export const adminDriverCreateClientSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: optionalPhoneSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  status: z.enum(['active', 'inactive', 'restricted']),
});

export const adminDriverUpdateClientSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: optionalPhoneSchema,
  status: z.enum(['active', 'inactive', 'restricted']),
});

export const adminDriverAssignVehicleClientSchema = z.object({
  driverId: z.string().uuid('Driver ID must be a valid UUID'),
  vehicleId: z.string().uuid('Vehicle ID must be a valid UUID'),
});
