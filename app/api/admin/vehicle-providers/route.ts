import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { providersService } from '@/lib/features/providers/providers.service';
import { createProviderSchema, providerQuerySchema } from '@/lib/features/providers/providers.schemas';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { ZodError } from 'zod';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * GET /api/admin/vehicle-providers
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    logIncoming(request);
    requireAdminAuth(request);
    const query = providerQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    logStep('validated providers query');

    const data = await providersService.list(query);
    logOutgoing(200, data);
    return jsonResponse(data, 'Providers fetched', 'Vehicle providers list retrieved');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to fetch providers';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch providers' });
    return errorResponse('Unable to fetch providers', 'Unexpected server error', 500);
  }
}

/**
 * POST /api/admin/vehicle-providers
 * Validates auth/input, delegates to service logic, and returns the standard API response envelope.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    requireAdminAuth(request);
    const body = createProviderSchema.parse(rawBody);
    logStep('validated provider create payload');

    const data = await providersService.create(body);
    logOutgoing(201, data);
    return jsonResponse(data, 'Provider created', 'Vehicle provider created successfully', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to create provider';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to create provider' });
    return errorResponse('Unable to create provider', 'Unexpected server error', 500);
  }
}
