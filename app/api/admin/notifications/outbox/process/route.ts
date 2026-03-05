import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { processOutboxQuerySchema } from '@/lib/features/notifications/notifications.schemas';
import { realtimeService } from '@/lib/features/realtime/realtime.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * POST /api/admin/notifications/outbox/process
 * Processes queued notification outbox retries.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const query = processOutboxQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    const data = await realtimeService.processOutbox(query.limit);
    return jsonResponse(data, 'Outbox processed', 'Notification outbox retries processed successfully');
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
        error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to process outbox';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to process outbox', 'Unexpected server error', 500);
  }
}
