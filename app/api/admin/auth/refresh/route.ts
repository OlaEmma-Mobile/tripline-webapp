import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { refreshTokenSchema } from '@/lib/features/auth/auth.schemas';
import { authService } from '@/lib/features/auth/auth.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/admin/auth/refresh
 * Rotates admin/sub-admin refresh token and issues new tokens.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const body = refreshTokenSchema.parse(rawBody);
    logStep('validated admin refresh token payload');

    const data = await authService.refreshAdminSession(body.refreshToken);
    logOutgoing(200, data);
    return jsonResponse(data, 'Session refreshed', 'New admin tokens issued');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }

    if (error instanceof AppError) {
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'Admin refresh failed', error.status);
    }

    logOutgoing(500, { error: 'Unable to refresh token' });
    return errorResponse('Unable to refresh token', 'Unexpected server error', 500);
  }
}
