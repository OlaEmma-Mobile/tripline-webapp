import { z } from 'zod';

export const adminVehicleFormClientSchema = z.object({
  registrationNumber: z.string().trim().min(1, 'Registration number is required'),
  model: z.string().trim().max(120, 'Model is too long').optional(),
  capacity: z.number().int('Capacity must be an integer').positive('Capacity must be greater than 0'),
  status: z.enum(['active', 'inactive', 'maintenance']),
});

export const adminVehicleToggleClientSchema = z.object({
  id: z.string().uuid('Vehicle ID must be a valid UUID'),
  status: z.enum(['active', 'inactive', 'maintenance']),
});
