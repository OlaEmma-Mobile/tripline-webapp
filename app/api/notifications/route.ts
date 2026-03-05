import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { notificationsQuerySchema } from '@/lib/features/notifications/notifications.schemas';
import { notificationsService } from '@/lib/features/notifications/notifications.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * GET /api/notifications
 * Lists authenticated user's notifications from Postgres.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request);
    const query = notificationsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    const data = await notificationsService.listUserNotifications({
      userId: auth.userId,
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly,
    });

    return jsonResponse(data, 'Notifications fetched', 'Notifications retrieved successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        'Invalid request payload',
        'Please fix the highlighted fields',
        400,
        zodErrorToFieldErrors(error)
      );
    }

    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : 'Unable to fetch notifications';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to fetch notifications', 'Unexpected server error', 500);
  }
}
