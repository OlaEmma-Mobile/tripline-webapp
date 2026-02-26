import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminOpsService } from '@/lib/features/admin-ops/admin-ops.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

const dashboardQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

/**
 * GET /api/admin/dashboard
 * Returns summary metrics, upcoming rides, and alerts.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const query = dashboardQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    const now = new Date();
    const from = query.from ?? now.toISOString().slice(0, 10);
    const to = query.to ?? from;
    const data = await adminOpsService.getDashboardSummary(from, to);
    return jsonResponse(data, 'Dashboard fetched', 'Dashboard summary retrieved');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        'Invalid request payload',
        'Please fix the highlighted fields',
        400,
        zodErrorToFieldErrors(error)
      );
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch dashboard';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch dashboard', 'Unexpected server error', 500);
  }
}
