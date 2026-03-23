import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { driversService } from '@/lib/features/drivers/drivers.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

const paramsSchema = z.object({
  rideInstanceId: z.string().uuid('Ride instance id must be a valid UUID'),
});

/**
 * GET /api/drivers/me/manifest/:rideInstanceId
 * Returns full driver manifest details for a single ride instance.
 * Access: driver only.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ rideInstanceId: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, {
      allowedRoles: ['driver'],
      forbiddenMessage: 'Only drivers can access manifests',
    });

    const { rideInstanceId } = await context.params;
    const parsed = paramsSchema.parse({ rideInstanceId });

    const data = await driversService.getManifestDetails(auth.userId, parsed.rideInstanceId);
    return jsonResponse(data, 'Manifest fetched', 'Driver manifest retrieved successfully');
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
          ? 'Drivers can only access their own manifest'
          : error.status === 404
            ? 'Ride instance not found'
            : error.status === 401
              ? error.message === 'Unauthorized'
                ? 'Authorization token is required'
                : 'Invalid or expired token'
              : 'Unable to fetch driver manifest';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to fetch driver manifest', 'Unexpected server error', 500);
  }
}
