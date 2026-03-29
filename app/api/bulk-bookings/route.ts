import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { bulkBookingsService } from '@/lib/features/bulk-bookings/bulk-bookings.service';
import { createBulkBookingRuleSchema } from '@/lib/features/bulk-bookings/bulk-bookings.schemas';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, { allowedRoles: ['rider'] });
    const data = await bulkBookingsService.listRulesByRider(auth.userId);
    return jsonResponse({ items: data }, 'Bulk bookings fetched', 'Bulk booking rules retrieved successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? 'Authorization token is required'
          : error.status === 403
            ? 'Only riders can access this resource'
            : 'Unable to fetch bulk bookings';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to fetch bulk bookings', 'Unexpected server error', 500);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, { allowedRoles: ['rider'] });
    const body = createBulkBookingRuleSchema.parse(await request.json());
    const data = await bulkBookingsService.createRule(body, auth.userId);
    return jsonResponse(data, 'Bulk booking created', 'Recurring bulk booking created successfully', 201);
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
          ? 'Authorization token is required'
          : error.status === 403
            ? 'Only riders can access this resource'
            : 'Unable to create bulk booking';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to create bulk booking', 'Unexpected server error', 500);
  }
}
