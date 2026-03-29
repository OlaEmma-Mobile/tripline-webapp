import { z } from 'zod';

export const rideInstanceStatusSchema = z.enum([
  'scheduled',
  'cancelled',
]);

export const rideTimeSlotSchema = z.enum(['morning', 'afternoon', 'evening']);

const baseRideInstanceSchema = z.object({
  routeId: z.string().uuid('Route id must be a valid UUID'),
  rideDate: z.string().date('Ride date must be in YYYY-MM-DD format'),
  timeSlot: rideTimeSlotSchema,
  status: rideInstanceStatusSchema.optional(),
});

export const createRideInstanceSchema = baseRideInstanceSchema;

export const createRideInstanceRequestSchema = z
  .object({
    routeId: z.string().uuid('Route id must be a valid UUID'),
    rideDate: z.string().date('Ride date must be in YYYY-MM-DD format'),
    timeSlot: rideTimeSlotSchema.optional(),
    timeSlots: z.array(rideTimeSlotSchema).min(1, 'Select at least one time slot').optional(),
    status: rideInstanceStatusSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.timeSlot && (!value.timeSlots || value.timeSlots.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['timeSlots'],
        message: 'Select at least one time slot',
      });
    }
  })
  .transform((value) => ({
    routeId: value.routeId,
    rideDate: value.rideDate,
    timeSlots: [...new Set(value.timeSlots ?? (value.timeSlot ? [value.timeSlot] : []))],
    status: value.status,
  }));

export const createRideInstanceBulkSchema = z.object({
  routeId: z.string().uuid('Route id must be a valid UUID'),
  rideDate: z.string().date('Ride date must be in YYYY-MM-DD format'),
  timeSlot: rideTimeSlotSchema,
  status: rideInstanceStatusSchema.optional(),
});

export const updateRideInstanceSchema = z
  .object({
    routeId: z.string().uuid('Route id must be a valid UUID').optional(),
    rideDate: z.string().date('Ride date must be in YYYY-MM-DD format').optional(),
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
