import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { assignDriverVehicleSchema } from '@/lib/features/assignments/assignments.schemas';
import { assignmentsService } from '@/lib/features/assignments/assignments.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/admin/assignments/driver-vehicle
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    requireAdminAuth(request);
    const body = assignDriverVehicleSchema.parse(rawBody);
    logStep('validated driver vehicle assignment payload');

    const data = await assignmentsService.assignDriverVehicle(body);
    logOutgoing(200, data);
    return jsonResponse(data, 'Assignment created', 'Driver assigned to vehicle successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to assign driver to vehicle';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to assign driver to vehicle' });
    return errorResponse('Unable to assign driver to vehicle', 'Unexpected server error', 500);
  }
}
