import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminBookingProblemSchema } from '@/lib/features/admin-ops/admin-ops.schemas';
import { adminOpsService } from '@/lib/features/admin-ops/admin-ops.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * PATCH /api/admin/bookings/[id]/problem
 * Flags or clears booking issue marker.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id } = await context.params;
    const body = adminBookingProblemSchema.parse(await request.json());
    const data = await adminOpsService.markBookingProblem({
      bookingId: id,
      flagged: body.flagged,
      note: body.note,
    });

    return jsonResponse(data, 'Booking updated', 'Booking problem flag updated successfully');
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
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to update booking';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to update booking', 'Unexpected server error', 500);
  }
}
