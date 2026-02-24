import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  phone: z.string().optional(),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  role: z.enum(['rider', 'driver'], { message: 'Please select a valid role' }),
});

export const verifyOtpSchema = z.object({
  verifyToken: z.string().min(10, { message: 'Verification token is required' }),
  otp: z.string().regex(/^[0-9]{4}$/, { message: 'OTP must be a 4-digit code' }),
});

export const resendOtpSchema = z.object({
  verifyToken: z.string().min(10, { message: 'Verification token is required' }),
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, { message: 'New password must be at least 8 characters' }),
  verifyToken: z.string().min(10, { message: 'Reset verification token is required' }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, { message: 'Refresh token is required' }),
});
