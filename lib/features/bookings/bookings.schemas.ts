import { z } from 'zod';

export const lockSeatSchema = z.object({
  rideInstanceId: z.string().uuid('Ride instance id must be a valid UUID'),
  seatCount: z
    .number()
    .int('Seat count must be an integer')
    .positive('Seat count must be greater than 0')
    .default(1),
});

/**
 * Payload validation for direct booked booking with token deduction.
 */
export const createBookingSchema = z.object({
  rideInstanceId: z.string().uuid('Ride instance id must be a valid UUID'),
  seatCount: z
    .number()
    .int('Seat count must be an integer')
    .positive('Seat count must be greater than 0')
    .default(1),
});

/**
 * Payload validation for driver boarding updates.
 */
export const boardBookingSchema = z
  .object({
    action: z
      .enum(['BOARDED', 'NO_SHOW', 'boarded', 'no_show'], {
        errorMap: () => ({ message: 'Action must be BOARDED or NO_SHOW' }),
      })
      .optional(),
    status: z
      .enum(['BOARDED', 'NO_SHOW', 'boarded', 'no_show'], {
        errorMap: () => ({ message: 'Status must be BOARDED or NO_SHOW' }),
      })
      .optional(),
  })
  .refine((value) => Boolean(value.action || value.status), {
    path: ['action'],
    message: 'Either action or status is required',
  });
