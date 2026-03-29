import { z } from 'zod';

export const lockSeatSchema = z.object({
  tripId: z.string().uuid('Trip id must be a valid UUID'),
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
  tripId: z.string().uuid('Trip id must be a valid UUID'),
  pickupPointId: z.string().uuid('Pickup point id must be a valid UUID'),
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
      .enum(['NO_SHOW', 'no_show'], {
        errorMap: () => ({ message: 'Action must be NO_SHOW' }),
      })
      .optional(),
    status: z
      .enum(['NO_SHOW', 'no_show'], {
        errorMap: () => ({ message: 'Status must be NO_SHOW' }),
      })
      .optional(),
  })
  .refine((value) => Boolean(value.action || value.status), {
    path: ['action'],
    message: 'Either action or status is required',
  });

/**
 * Payload validation for batch driver boarding updates.
 */
export const batchBoardingSchema = z.object({
  updates: z
    .array(
      z.object({
        bookingId: z.string().uuid('Booking id must be a valid UUID'),
        status: z.enum(['NO_SHOW', 'no_show'], {
          errorMap: () => ({ message: 'Status must be NO_SHOW' }),
        }),
      })
    )
    .min(1, 'At least one booking update is required'),
});

export const requestBoardingSchema = z.object({});

export const verifyBoardingPasscodeSchema = z.object({
  passcode: z.string().regex(/^\d{4}$/, 'Passcode must be exactly 4 digits'),
});

export const respondBoardingSchema = z
  .object({
    decision: z.enum(['approve', 'decline']),
    passcode: z.string().regex(/^\d{4}$/, 'Passcode must be exactly 4 digits').optional(),
    declineReason: z.string().max(500, 'Decline reason cannot exceed 500 characters').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'approve' && !value.passcode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['passcode'],
        message: 'Passcode is required to approve boarding',
      });
    }
  });
