import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminSettingsUpdateSchema } from '@/lib/features/admin-ops/admin-ops.schemas';
import { adminOpsService } from '@/lib/features/admin-ops/admin-ops.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * GET /api/admin/settings
 * Returns operational app settings.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const data = await adminOpsService.getSettings();
    return jsonResponse(data, 'Settings fetched', 'Application settings retrieved');
  } catch (error) {
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch settings';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to fetch settings', 'Unexpected server error', 500);
  }
}

/**
 * PATCH /api/admin/settings
 * Updates operational app settings.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAdminAuth(request);
    const body = adminSettingsUpdateSchema.parse(await request.json());
    const data = await adminOpsService.updateSettings(body, auth.userId);
    return jsonResponse(data, 'Settings updated', 'Application settings updated successfully');
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
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to update settings';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to update settings', 'Unexpected server error', 500);
  }
}
