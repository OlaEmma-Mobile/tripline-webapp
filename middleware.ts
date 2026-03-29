import { NextRequest, NextResponse } from 'next/server';

const AUTH_WHITELIST = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/verify-otp',
  '/api/auth/resend-otp',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  '/api/admin/auth/login',
  '/api/admin/auth/refresh',
  '/api/openapi',
  '/api/routes',
  '/api/paystack/webhook',
];

/**
 * Require Authorization header for protected API routes.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  if (AUTH_WHITELIST.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        hasError: true,
        data: null,
        message: 'Unauthorized',
        description: 'Authorization token is required',
        errors: {},
      },
      { status: 401 }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
