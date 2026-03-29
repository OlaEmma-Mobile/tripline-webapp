import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { bulkBookingsService } from '@/lib/features/bulk-bookings/bulk-bookings.service';
import { updateBulkBookingRuleSchema } from '@/lib/features/bulk-bookings/bulk-bookings.schemas';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, { allowedRoles: ['rider'] });
    const { id } = await context.params;
    const data = await bulkBookingsService.getRuleDetails(id, auth.userId);
    return jsonResponse(data, 'Bulk booking fetched', 'Bulk booking details retrieved successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? 'Authorization token is required'
          : error.status === 403
            ? 'Only riders can access this resource'
            : error.status === 404
              ? 'Bulk booking rule not found'
              : 'Unable to fetch bulk booking';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to fetch bulk booking', 'Unexpected server error', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, { allowedRoles: ['rider'] });
    const { id } = await context.params;
    const body = updateBulkBookingRuleSchema.parse(await request.json());
    const data = await bulkBookingsService.updateRule(id, auth.userId, body);
    return jsonResponse(data, 'Bulk booking updated', 'Bulk booking updated successfully');
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
            : error.status === 404
              ? 'Bulk booking rule not found'
              : 'Unable to update bulk booking';
      return errorResponse(error.message, description, error.status);
    }

    return errorResponse('Unable to update bulk booking', 'Unexpected server error', 500);
  }
}
