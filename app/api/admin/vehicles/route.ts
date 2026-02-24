import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { createVehicleSchema, vehiclesQuerySchema } from '@/lib/features/vehicles/vehicles.schemas';
import { vehiclesService } from '@/lib/features/vehicles/vehicles.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * GET /api/admin/vehicles
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAdminAuth(request);
    const query = vehiclesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    logStep('validated vehicles query');

    const data = await vehiclesService.list(query);
    logOutgoing(200, data);
    return jsonResponse(data, 'Vehicles fetched', 'Vehicles list retrieved');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch vehicles';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch vehicles' });
    return errorResponse('Unable to fetch vehicles', 'Unexpected server error', 500);
  }
}

/**
 * POST /api/admin/vehicles
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    requireAdminAuth(request);
    const body = createVehicleSchema.parse(rawBody);
    logStep('validated vehicle create payload');

    const data = await vehiclesService.create(body);
    logOutgoing(201, data);
    return jsonResponse(data, 'Vehicle created', 'Vehicle created successfully', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to create vehicle';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to create vehicle' });
    return errorResponse('Unable to create vehicle', 'Unexpected server error', 500);
  }
}
