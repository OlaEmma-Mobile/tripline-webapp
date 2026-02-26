import { z } from 'zod';

export const adminLoginClientSchema = z.object({
  email: z.string().trim().email('Enter a valid work email'),
  password: z.string().min(1, 'Password is required'),
});

export const adminForgotPasswordClientSchema = z.object({
  email: z.string().trim().email('Enter a valid work email'),
});

export const adminVerifyOtpClientSchema = z.object({
  verifyToken: z.string().min(10, 'Verification token is required'),
  otp: z.string().regex(/^\d{4}$/, 'OTP must be exactly 4 digits'),
});

export const adminResendOtpClientSchema = z.object({
  verifyToken: z.string().min(10, 'Verification token is required'),
});

export const adminResetPasswordClientSchema = z
  .object({
    verifyToken: z.string().min(10, 'Reset token is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
