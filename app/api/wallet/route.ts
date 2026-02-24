import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/lib/utils/errors';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { walletService } from '@/lib/features/wallet/wallet.service';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { logIncoming, logOutgoing } from '@/lib/utils/logger';

/**
 * GET /api/wallet
 * Return wallet balance for authenticated user.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    logIncoming(request);
    const auth = requireAccessAuth(request, {
      allowedRoles: ['rider', 'driver'],
      forbiddenMessage: 'Only riders and drivers can use token wallet',
    });

    const data = await walletService.getWallet(auth.userId);
    logOutgoing(200, data);
    return jsonResponse(data, 'Wallet retrieved', 'Wallet balance returned');
  } catch (error) {
    if (error instanceof AppError) {
      const description =
        error.status === 401
          ? error.message === 'Unauthorized'
            ? 'Authorization token is required'
            : 'Invalid or expired token'
          : error.message;
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, description, error.status);
    }
    logOutgoing(500, { error: 'Unable to retrieve wallet' });
    return errorResponse('Unable to retrieve wallet', 'Unexpected server error', 500);
  }
}
