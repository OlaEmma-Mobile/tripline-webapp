import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { notificationsService } from '@/lib/features/notifications/notifications.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications as read for the authenticated user.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request);
    const data = await notificationsService.markAllRead(auth.userId);
    return jsonResponse(data, 'Notifications updated', 'All unread notifications marked as read');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : 'Unable to update notifications';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to update notifications', 'Unexpected server error', 500);
  }
}
