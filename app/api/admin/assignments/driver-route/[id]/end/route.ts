import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { assignmentsService } from '@/lib/features/assignments/assignments.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { logIncoming, logOutgoing } from '@/lib/utils/logger';

/**
 * POST /api/admin/assignments/driver-route/[id]/end
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAdminAuth(request);
    const { id } = await context.params;
    const data = await assignmentsService.endDriverRouteAssignment(id);
    logOutgoing(200, data);
    return jsonResponse(data, 'Assignment ended', 'Driver route assignment ended successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to end assignment';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to end assignment' });
    return errorResponse('Unable to end assignment', 'Unexpected server error', 500);
  }
}
