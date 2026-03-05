import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { savePushTokenSchema } from '@/lib/features/notifications/notifications.schemas';
import { usersRepository } from '@/lib/features/users/users.repository';
import { AppError } from '@/lib/utils/errors';
import { logIncoming, logOutgoing } from '@/lib/utils/logger';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * PATCH /api/users/me/push-token
 * Registers or updates the current user's FCM push token.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);

    const auth = requireAccessAuth(request);
    const body = savePushTokenSchema.parse(rawBody);

    await usersRepository.setFcmToken(auth.userId, {
      token: body.token,
      platform: body.platform,
    });

    logOutgoing(200, { saved: true });
    return jsonResponse({ saved: true }, 'Push token saved', 'Push token saved successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }

    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : 'Unable to save push token';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }

    logOutgoing(500, { error: 'Unable to save push token' });
    return errorResponse('Unable to save push token', 'Unexpected server error', 500);
  }
}

/**
 * DELETE /api/users/me/push-token
 * Removes the current user's FCM token (logout/uninstall).
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    logIncoming(request);
    const auth = requireAccessAuth(request);

    await usersRepository.clearFcmToken(auth.userId);

    logOutgoing(200, { cleared: true });
    return jsonResponse({ cleared: true }, 'Push token removed', 'Push token removed successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : 'Unable to remove push token';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }

    logOutgoing(500, { error: 'Unable to remove push token' });
    return errorResponse('Unable to remove push token', 'Unexpected server error', 500);
  }
}
