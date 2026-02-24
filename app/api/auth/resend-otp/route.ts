import { NextRequest, NextResponse } from 'next/server';
import { resendOtpSchema } from '@/lib/features/auth/auth.schemas';
import { authService } from '@/lib/features/auth/auth.service';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { AppError } from '@/lib/utils/errors';
import { ZodError } from 'zod';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { ResendOtpPayload } from '@/lib/features/auth/auth.types';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/auth/resend-otp
 * Resend OTP using a verification token.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const body = resendOtpSchema.parse(rawBody) as ResendOtpPayload;
    logStep('validated resend-otp payload');
    const data = await authService.resendOtp(body.verifyToken);
    logOutgoing(200, data);
    return jsonResponse(data, 'OTP resent', 'Check your email for the new code');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'Resend OTP failed', error.status);
    }
    logOutgoing(500, { error: 'Unable to resend OTP' });
    return errorResponse('Unable to resend OTP', 'Unexpected server error', 500);
  }
}
