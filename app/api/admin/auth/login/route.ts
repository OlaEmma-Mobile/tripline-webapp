import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { loginSchema } from '@/lib/features/auth/auth.schemas';
import { authService } from '@/lib/features/auth/auth.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/admin/auth/login
 * Authenticates admin/sub-admin credentials and issues tokens.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const body = loginSchema.parse(rawBody);
    logStep('validated admin login payload');

    const data = await authService.loginAdmin({
      email: body.email,
      password: body.password,
    });

    logOutgoing(200, data);
    return jsonResponse(data, 'Login successful', 'Admin tokens issued');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }

    if (error instanceof AppError) {
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'Admin login failed', error.status);
    }

    logOutgoing(500, { error: 'Unable to login' });
    return errorResponse('Unable to login', 'Unexpected server error', 500);
  }
}
