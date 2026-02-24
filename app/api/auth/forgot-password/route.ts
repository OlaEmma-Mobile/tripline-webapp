import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/features/auth/auth.schemas';
import { authService } from '@/lib/features/auth/auth.service';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { AppError } from '@/lib/utils/errors';
import { ZodError } from 'zod';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { ForgotPasswordPayload } from '@/lib/features/auth/auth.types';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/auth/forgot-password
 * Send a reset OTP to the user's email.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const body = forgotPasswordSchema.parse(rawBody) as ForgotPasswordPayload;
    logStep('validated forgot-password payload');
    const data = await authService.forgotPassword(body.email);
    logOutgoing(200, data);
    return jsonResponse(data, 'OTP sent', 'Check your email for reset code');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'Password reset failed', error.status);
    }
    logOutgoing(500, { error: 'Unable to start password reset' });
    return errorResponse('Unable to start password reset', 'Unexpected server error', 500);
  }
}
