import { z } from 'zod';

export const ridePasscodeSchema = z.string().regex(/^\d{4}$/, 'Ride passcode must be exactly 4 digits');

export const setupRidePasscodeSchema = z.object({
  passcode: ridePasscodeSchema,
});

export const changeRidePasscodeSchema = z.object({
  currentPasscode: ridePasscodeSchema,
  newPasscode: ridePasscodeSchema,
});

export const requestRidePasscodeResetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const confirmRidePasscodeResetSchema = z.object({
  verifyToken: z.string().min(10, 'Reset verification token is required'),
  newPasscode: ridePasscodeSchema,
});
