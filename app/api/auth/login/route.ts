import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/features/auth/auth.schemas';
import { authService } from '@/lib/features/auth/auth.service';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { AppError } from '@/lib/utils/errors';
import { ZodError } from 'zod';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { LoginPayload } from '@/lib/features/auth/auth.types';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Log in as a rider or driver
 *     description: Validates credentials and returns access tokens with account flags.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Login succeeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasError:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/RiderLoginResponse'
 *                 message:
 *                   type: string
 *                 description:
 *                   type: string
 *                 errors:
 *                   type: object
 *       '400':
 *         description: Invalid login payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '401':
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const body = loginSchema.parse(rawBody) as LoginPayload;
    logStep('validated login payload');
    const data = await authService.loginUser(body);
    logOutgoing(200, data);
    return jsonResponse(data, 'Login successful', 'Tokens issued');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'Login failed', error.status);
    }
    logOutgoing(500, { error: 'Unable to login' });
    return errorResponse('Unable to login', 'Unexpected server error', 500);
  }
}
