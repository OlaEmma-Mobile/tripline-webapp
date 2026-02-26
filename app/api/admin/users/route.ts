import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminUsersQuerySchema } from '@/lib/features/admin-ops/admin-ops.schemas';
import { adminOpsService } from '@/lib/features/admin-ops/admin-ops.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * GET /api/admin/users
 * Lists users with wallet/token snapshots for admin operations.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const query = adminUsersQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    const data = await adminOpsService.listUsers(query);
    return jsonResponse(data, 'Users fetched', 'Users list retrieved');
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
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch users';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch users', 'Unexpected server error', 500);
  }
}
