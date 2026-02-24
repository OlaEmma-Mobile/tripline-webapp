import { z } from 'zod';

export const vehicleStatusSchema = z.enum(['active', 'inactive', 'maintenance']);

const vehicleBaseSchema = z.object({
  providerId: z.string().uuid('Provider id must be a valid UUID').nullable().optional(),
  registrationNumber: z.string().trim().min(1, 'Registration number is required'),
  model: z.string().trim().min(1, 'Model is required').optional(),
  capacity: z.number().int().positive('Capacity must be greater than 0'),
  status: vehicleStatusSchema.optional(),
});

export const createVehicleSchema = vehicleBaseSchema;
export const updateVehicleSchema = vehicleBaseSchema.partial();

export const assignProviderSchema = z.object({
  providerId: z.string().uuid('Provider id must be a valid UUID').nullable(),
});

export const vehiclesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: vehicleStatusSchema.optional(),
  providerId: z.string().uuid().optional(),
  q: z.string().trim().optional(),
});
