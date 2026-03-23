import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { assertDriverOwnsPathUser } from '@/lib/features/drivers/driver-booking-auth';
import { driversService } from '@/lib/features/drivers/drivers.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

const manifestQuerySchema = z.object({
  date: z
    .string({ required_error: 'Date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

/**
 * GET /api/drivers/:id/manifest?date=YYYY-MM-DD
 * Returns driver manifest grouped by ride instance for a specific date.
 * Access: driver (self only).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    logIncoming(request);

    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver'],
      forbiddenMessage: 'Only drivers can access manifests',
    });

    const { id: pathDriverId } = await context.params;
    assertDriverOwnsPathUser(auth.userId, pathDriverId);

    const query = manifestQuerySchema.parse({
      date: request.nextUrl.searchParams.get('date'),
    });
    logStep('validated manifest query');

    const responseData = await driversService.getManifest(pathDriverId, query.date);

    logOutgoing(200, responseData);
    return jsonResponse(responseData, 'Manifest fetched', 'Driver manifest retrieved successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse(
        'Invalid request payload',
        'Please fix the highlighted fields',
        400,
        errors
      );
    }

    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Drivers can only access their own manifest'
          : error.status === 401
            ? error.message === 'Unauthorized'
              ? 'Authorization token is required'
              : 'Invalid or expired token'
            : 'Unable to fetch driver manifest';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }

    logOutgoing(500, { error: 'Unable to fetch driver manifest' });
    return errorResponse('Unable to fetch driver manifest', 'Unexpected server error', 500);
  }
}
