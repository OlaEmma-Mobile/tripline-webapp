import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { bulkBookingsService } from '@/lib/features/bulk-bookings/bulk-bookings.service';
import { replicateRideInstancesSchema } from '@/lib/features/bulk-bookings/bulk-bookings.schemas';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const body = replicateRideInstancesSchema.parse(await request.json());
    const data = await bulkBookingsService.replicateRideInstances(body);
    return jsonResponse(data, 'Ride templates replicated', 'Future ride instances and trips created successfully');
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
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to replicate ride instances';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to replicate ride instances', 'Unexpected server error', 500);
  }
}
