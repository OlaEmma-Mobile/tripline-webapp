import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { bulkBookingsService } from '@/lib/features/bulk-bookings/bulk-bookings.service';
import { replicateRideInstancesSchema } from '@/lib/features/bulk-bookings/bulk-bookings.schemas';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

function assertCronSecret(request: NextRequest): void {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get('x-cron-secret') !== expected) {
    throw new Error('FORBIDDEN');
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertCronSecret(request);
    const body = replicateRideInstancesSchema.parse(await request.json());
    const data = await bulkBookingsService.replicateRideInstances(body);
    return jsonResponse(data, 'Ride replication job processed', 'Future ride instances and trips generated successfully');
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return errorResponse('Forbidden', 'Cron secret is invalid', 403);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        'Invalid request payload',
        'Please fix the highlighted fields',
        400,
        zodErrorToFieldErrors(error)
      );
    }

    return errorResponse('Unable to replicate ride instances', 'Unexpected server error', 500);
  }
}
