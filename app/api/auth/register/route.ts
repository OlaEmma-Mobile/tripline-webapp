import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/features/auth/auth.schemas';
import { authService } from '@/lib/features/auth/auth.service';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { AppError } from '@/lib/utils/errors';
import { ZodError } from 'zod';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { RegisterPayload } from '@/lib/features/auth/auth.types';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/auth/register
 * Create rider or driver account and send OTP.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const body = registerSchema.parse(rawBody) as RegisterPayload;
    logStep('validated register payload');
    const result = await authService.registerUser(body);
    const payload = { id: result.user.id, verifyToken: result.verifyToken };
    logOutgoing(201, payload);
    return jsonResponse(payload, 'Registration successful', 'OTP sent to email', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'Registration failed', error.status);
    }
    logOutgoing(500, { error: 'Unable to register user' });
    return errorResponse('Unable to register user', 'Unexpected server error', 500);
  }
}
