import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { createDriverSchema, driversQuerySchema } from '@/lib/features/drivers/drivers.schemas';
import { driversService } from '@/lib/features/drivers/drivers.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * GET /api/admin/drivers
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAdminAuth(request);
    const query = driversQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    logStep('validated drivers query');

    const data = await driversService.list(query);
    logOutgoing(200, data);
    return jsonResponse(data, 'Drivers fetched', 'Drivers list retrieved');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch drivers';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch drivers' });
    return errorResponse('Unable to fetch drivers', 'Unexpected server error', 500);
  }
}

/**
 * POST /api/admin/drivers
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    requireAdminAuth(request);
    const body = createDriverSchema.parse(rawBody);
    logStep('validated driver create payload');

    const data = await driversService.create(body);
    logOutgoing(201, data);
    return jsonResponse(data, 'Driver created', 'Driver account created successfully', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to create driver';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to create driver' });
    return errorResponse('Unable to create driver', 'Unexpected server error', 500);
  }
}
