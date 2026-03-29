import { z } from 'zod';

export const bulkBookingWeekdaySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
export const bulkBookingTimeSlotSchema = z.enum(['morning', 'evening']);
export const bulkBookingDurationSchema = z.enum(['1_week', '2_weeks', '3_weeks', '1_month']);
export const bulkBookingDayModeSchema = z.enum(['custom_days', 'working_days']);
export const bulkBookingStatusSchema = z.enum(['active', 'paused', 'cancelled']);

export const createBulkBookingRuleSchema = z.object({
  routeId: z.string().uuid('Route id must be a valid UUID'),
  pickupPointId: z.string().uuid('Pickup point id must be a valid UUID'),
  timeSlots: z.array(bulkBookingTimeSlotSchema).min(1).max(2),
  durationType: bulkBookingDurationSchema,
  dayMode: bulkBookingDayModeSchema,
  weekdays: z.array(bulkBookingWeekdaySchema).optional(),
  startDate: z.string().date('Start date must be in YYYY-MM-DD format'),
  seatCount: z.coerce.number().int().positive().default(1),
}).superRefine((value, ctx) => {
  if (value.dayMode === 'custom_days' && (!value.weekdays || value.weekdays.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weekdays'], message: 'Weekdays are required for custom day mode' });
  }
});

export const updateBulkBookingRuleSchema = z.object({
  status: bulkBookingStatusSchema,
});

export const replicateRideInstancesSchema = z.object({
  sourceRideInstanceId: z.string().uuid('Ride instance id must be a valid UUID'),
  duration: z.enum(['7_days', '1_month']),
});
