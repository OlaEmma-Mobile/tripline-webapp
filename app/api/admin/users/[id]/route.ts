import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminOpsService } from '@/lib/features/admin-ops/admin-ops.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * GET /api/admin/users/[id]
 * Returns detailed profile, wallet ledger, purchases, and active bookings.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id } = await context.params;
    const data = await adminOpsService.getUserDetail(id);
    return jsonResponse(data, 'User detail fetched', 'User detail retrieved successfully');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch user detail';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch user detail', 'Unexpected server error', 500);
  }
}
