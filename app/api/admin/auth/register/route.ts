import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminRegisterSchema } from '@/lib/features/auth/auth.schemas';
import { authService } from '@/lib/features/auth/auth.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/admin/auth/register
 * Creates admin/sub-admin account. Requires authenticated admin/sub-admin.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const auth = requireAdminAuth(request);
    const body = adminRegisterSchema.parse(rawBody);
    logStep('validated admin register payload');

    if (auth.role === 'sub_admin' && body.role === 'admin') {
      return errorResponse('Forbidden', 'Sub-admin cannot create admin accounts', 403);
    }

    const data = await authService.registerAdminUser({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      password: body.password,
      role: body.role,
      status: body.status,
    });

    logOutgoing(201, data);
    return jsonResponse(data, 'Admin user created', 'Admin account created successfully', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }

    if (error instanceof AppError) {
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'Admin registration failed', error.status);
    }

    logOutgoing(500, { error: 'Unable to register admin user' });
    return errorResponse('Unable to register admin user', 'Unexpected server error', 500);
  }
}
