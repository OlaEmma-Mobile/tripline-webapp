import { z } from 'zod';

export const rideInstanceStatusSchema = z.enum([
  'scheduled',
  'boarding',
  'departed',
  'completed',
  'cancelled',
]);

export const rideTimeSlotSchema = z.enum(['morning', 'afternoon', 'evening']);

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

const baseRideInstanceSchema = z.object({
  routeId: z.string().uuid('Route id must be a valid UUID'),
  rideDate: z.string().date('Ride date must be in YYYY-MM-DD format'),
  departureTime: z.string().regex(timeRegex, 'Departure time must be HH:MM or HH:MM:SS'),
  timeSlot: rideTimeSlotSchema,
  status: rideInstanceStatusSchema.optional(),
});

export const createRideInstanceSchema = baseRideInstanceSchema;

export const createRideInstanceBulkSchema = z.object({
  routeId: z.string().uuid('Route id must be a valid UUID'),
  rideDate: z.string().date('Ride date must be in YYYY-MM-DD format'),
  departureTimes: z
    .array(z.string().regex(timeRegex, 'Departure time must be HH:MM or HH:MM:SS'))
    .min(1, 'At least one departure time is required')
    .refine((times) => {
      const normalized = times.map((time) => {
        const parts = time.split(':');
        return parts.length === 2 ? `${parts[0]}:${parts[1]}:00` : time;
      });
      return new Set(normalized).size === normalized.length;
    }, 'Duplicate departure times are not allowed'),
  timeSlot: rideTimeSlotSchema,
  status: rideInstanceStatusSchema.optional(),
});

export const updateRideInstanceSchema = z
  .object({
    routeId: z.string().uuid('Route id must be a valid UUID').optional(),
    rideDate: z.string().date('Ride date must be in YYYY-MM-DD format').optional(),
    departureTime: z
      .string()
      .regex(timeRegex, 'Departure time must be HH:MM or HH:MM:SS')
      .optional(),
    timeSlot: rideTimeSlotSchema.optional(),
    status: rideInstanceStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
    path: ['form'],
  });

export const rideInstancesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  routeId: z.string().uuid().optional(),
  rideDate: z.string().date().optional(),
  timeSlot: rideTimeSlotSchema.optional(),
  status: rideInstanceStatusSchema.optional(),
});
