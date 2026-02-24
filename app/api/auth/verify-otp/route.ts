import { NextRequest, NextResponse } from 'next/server';
import { verifyOtpSchema } from '@/lib/features/auth/auth.schemas';
import { authService } from '@/lib/features/auth/auth.service';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { AppError } from '@/lib/utils/errors';
import { ZodError } from 'zod';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { VerifyOtpPayload } from '@/lib/features/auth/auth.types';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/auth/verify-otp
 * Verify OTP for email confirmation or password reset.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const body = verifyOtpSchema.parse(rawBody) as VerifyOtpPayload;
    logStep('validated verify-otp payload');
    const result = await authService.verifyOtp(body);
    const message = result.purpose === 'reset_password' ? 'OTP verified' : 'Email verified';
    const description = result.purpose === 'reset_password'
      ? 'Use verify token to reset password'
      : 'Account verified successfully';
    logOutgoing(200, result);
    return jsonResponse(result, message, description);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'OTP verification failed', error.status);
    }
    logOutgoing(500, { error: 'Unable to verify OTP' });
    return errorResponse('Unable to verify OTP', 'Unexpected server error', 500);
  }
}
