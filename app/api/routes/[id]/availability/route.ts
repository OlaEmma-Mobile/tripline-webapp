import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rideInstancesService } from '@/lib/features/ride-instances/ride-instances.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

const availabilityQuerySchema = z.object({
  date: z.string().date('date query must be in YYYY-MM-DD format'),
});

/**
 * GET /api/routes/:id/availability?date=YYYY-MM-DD
 * Returns route ride instances and available seats for the specified date.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    logIncoming(request);
    const { id } = await context.params;
    const query = availabilityQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    logStep('validated route availability query', { routeId: id, date: query.date });

    const data = await rideInstancesService.getRouteAvailability(id, query.date);
    logOutgoing(200, data);
    return jsonResponse(data, 'Route availability fetched', 'Route availability retrieved');
  } catch (error) {
    if (error instanceof z.ZodError) {
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
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'Unable to fetch route availability', error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch route availability' });
    return errorResponse('Unable to fetch route availability', 'Unexpected server error', 500);
  }
}
