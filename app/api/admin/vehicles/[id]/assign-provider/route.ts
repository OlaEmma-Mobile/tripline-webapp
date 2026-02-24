import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { assignProviderSchema } from '@/lib/features/vehicles/vehicles.schemas';
import { vehiclesService } from '@/lib/features/vehicles/vehicles.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/admin/vehicles/[id]/assign-provider
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    requireAdminAuth(request);
    const body = assignProviderSchema.parse(rawBody);
    logStep('validated assign provider payload');

    const { id } = await context.params;
    const data = await vehiclesService.assignProvider(id, body);
    logOutgoing(200, data);
    return jsonResponse(data, 'Provider assigned', 'Vehicle provider assignment updated');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to assign provider';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to assign provider' });
    return errorResponse('Unable to assign provider', 'Unexpected server error', 500);
  }
}
