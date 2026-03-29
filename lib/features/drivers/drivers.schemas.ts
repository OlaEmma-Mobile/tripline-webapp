import { z } from 'zod';

export const driverStatusSchema = z.enum(['active', 'inactive', 'restricted']);

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, 'Phone must be a valid phone number');

export const createDriverSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Valid email is required'),
  phone: phoneSchema.optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  status: driverStatusSchema.optional(),
});

export const updateDriverSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').optional(),
  lastName: z.string().trim().min(1, 'Last name is required').optional(),
  email: z.string().trim().email('Valid email is required').optional(),
  phone: phoneSchema.optional(),
  status: driverStatusSchema.optional(),
});

export const driversQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: driverStatusSchema.optional(),
  q: z.string().trim().optional(),
  rideDate: z.string().date().optional(),
  timeSlot: z.enum(['morning', 'afternoon', 'evening']).optional(),
  rideInstanceId: z.string().uuid().optional(),
});

export const driverLocationUpdateSchema = z.object({
  tripId: z.string().uuid('Trip id must be a valid UUID'),
  lat: z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  lng: z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
  driverOnline: z.boolean().optional().default(true),
  recordedAt: z.string().datetime().optional(),
});
