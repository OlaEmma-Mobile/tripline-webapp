import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/features/auth/auth.schemas';
import { authService } from '@/lib/features/auth/auth.service';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { AppError } from '@/lib/utils/errors';
import { ZodError } from 'zod';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/auth/reset-password
 * Verify reset token and update password.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const body = resetPasswordSchema.parse(rawBody);
    logStep('validated reset-password payload');
    const data = await authService.resetPassword(body);
    logOutgoing(200, data);
    return jsonResponse(data, 'Password updated', 'You can log in with your new password');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'Reset password failed', error.status);
    }
    logOutgoing(500, { error: 'Unable to reset password' });
    return errorResponse('Unable to reset password', 'Unexpected server error', 500);
  }
}
