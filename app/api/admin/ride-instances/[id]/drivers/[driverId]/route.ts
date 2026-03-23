import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { assignmentsService } from '@/lib/features/assignments/assignments.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { logIncoming, logOutgoing } from '@/lib/utils/logger';

/**
 * DELETE /api/admin/ride-instances/:id/drivers/:driverId
 * Ends a driver's active assignment on a ride instance.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; driverId: string }> }
): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAdminAuth(request);
    const { id, driverId } = await context.params;
    const data = await assignmentsService.unassignRideDriver(id, driverId);
    logOutgoing(200, data);
    return jsonResponse(data, 'Driver unassigned', 'Driver unassigned from ride successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only admin roles can access this resource'
          : error.status === 404
            ? 'Ride driver assignment not found'
            : 'Unable to unassign driver from ride';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to unassign driver from ride' });
    return errorResponse('Unable to unassign driver from ride', 'Unexpected server error', 500);
  }
}
