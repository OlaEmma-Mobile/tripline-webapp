import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminOpsRepository } from '@/lib/features/admin-ops/admin-ops.repository';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

/**
 * GET /api/admin/ride-instances/[id]/manifest
 * Returns ride passenger manifest for admin monitoring.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id } = await context.params;
    const rows = await adminOpsRepository.getRideManifestRows(id);
    const totalTokensConsumed = rows.reduce((sum, row) => sum + row.tokenCost, 0);

    return jsonResponse(
      {
        rideInstanceId: id,
        passengers: rows,
        totalTokensConsumed,
      },
      'Manifest fetched',
      'Ride manifest retrieved successfully'
    );
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch manifest';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch manifest', 'Unexpected server error', 500);
  }
}
