import { z } from 'zod';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
const getLocalTodayIso = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const departureTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Departure time must be in HH:MM or HH:MM:SS format');

export const adminRidesFilterClientSchema = z.object({
  date: isoDateSchema.optional().or(z.literal('')),
  status: z
    .enum(['', 'scheduled', 'boarding', 'departed', 'completed', 'cancelled'])
    .optional(),
  page: z.number().int().positive('Page must be greater than 0'),
  limit: z.number().int().positive('Limit must be greater than 0').max(100, 'Limit cannot exceed 100'),
});

export const adminRideStatusUpdateClientSchema = z.object({
  id: z.string().uuid('Ride instance ID must be a valid UUID'),
  status: z.enum(['scheduled', 'boarding', 'departed', 'completed', 'cancelled']),
});

export const adminRideMonitorActionClientSchema = z.object({
  rideInstanceId: z.string().uuid('Ride instance ID must be a valid UUID'),
});

export const adminRideCreateClientSchema = z.object({
  routeId: z.string().uuid('Route ID must be a valid UUID'),
  rideDate: isoDateSchema.refine((value) => {
    const today = getLocalTodayIso();
    return value >= today;
  }, 'Ride date cannot be in the past'),
  departureTime: departureTimeSchema,
  timeSlot: z.enum(['morning', 'afternoon', 'evening']),
});
