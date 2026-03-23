import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminOpsService } from '@/lib/features/admin-ops/admin-ops.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * GET /api/admin/ride-instances/:id/details
 * Returns full ride instance details for admin.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id } = await context.params;
    const data = await adminOpsService.getRideInstanceDetails(id);
    return jsonResponse(data, 'Ride details fetched', 'Ride instance details retrieved successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 403
          ? 'Only admin roles can access this resource'
          : error.status === 404
            ? 'Ride instance not found'
            : 'Unable to fetch ride instance details';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch ride instance details', 'Unexpected server error', 500);
  }
}
