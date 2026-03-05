import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { notificationsService } from '@/lib/features/notifications/notifications.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * PATCH /api/notifications/[id]/read
 * Marks one notification as read for the authenticated user.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request);
    const { id } = await context.params;

    const data = await notificationsService.markRead(id, auth.userId);
    return jsonResponse(data, 'Notification updated', 'Notification marked as read');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : error.status === 404
            ? 'Notification not found for current user'
            : 'Unable to update notification';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to update notification', 'Unexpected server error', 500);
  }
}
