import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminBookingRefundSchema } from '@/lib/features/admin-ops/admin-ops.schemas';
import { adminOpsService } from '@/lib/features/admin-ops/admin-ops.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * PATCH /api/admin/bookings/[id]/refund
 * Credits rider wallet and tracks refund metadata in booking + wallet ledger.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAdminAuth(request);
    const { id } = await context.params;
    const body = adminBookingRefundSchema.parse(await request.json());

    const data = await adminOpsService.refundBooking({
      bookingId: id,
      amount: body.amount,
      reason: body.reason,
      adminId: auth.userId,
    });

    return jsonResponse(data, 'Refund completed', 'Booking refund applied successfully');
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
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to process refund';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to process refund', 'Unexpected server error', 500);
  }
}
