import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminNotificationsQuerySchema } from '@/lib/features/notifications/notifications.schemas';
import { notificationsService } from '@/lib/features/notifications/notifications.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * GET /api/admin/notifications/delivery-attempts
 * Lists channel delivery attempts for admin troubleshooting.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const query = adminNotificationsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    const data = await notificationsService.listDeliveryAttempts(query);
    return jsonResponse(data, 'Delivery attempts fetched', 'Notification delivery attempts retrieved');
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
        error.status === 403
          ? 'Only admin roles can access this resource'
          : 'Unable to fetch delivery attempts';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch delivery attempts', 'Unexpected server error', 500);
  }
}
