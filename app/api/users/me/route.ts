import { NextRequest, NextResponse } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { usersService } from '@/lib/features/users/users.service';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { logIncoming, logOutgoing } from '@/lib/utils/logger';

/**
 * GET /api/users/me
 * Returns authenticated user profile and account status flags.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    logIncoming(request);
    const auth = requireAccessAuth(request);
    const data = await usersService.getMe(auth.userId);
    logOutgoing(200, data);
    return jsonResponse(data, 'Profile fetched', 'Authenticated profile retrieved');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : 'Unable to fetch profile';
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to fetch profile' });
    return errorResponse('Unable to fetch profile', 'Unexpected server error', 500);
  }
}
