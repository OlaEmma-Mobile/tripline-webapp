import type { NextRequest } from 'next/server';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';

export interface AdminAuthContext {
  userId: string;
  role: 'admin' | 'sub_admin';
  email?: string;
}

/**
 * requireAdminAuth Pure helper that transforms data between transport, domain, and persistence shapes.
 */
export function requireAdminAuth(request: NextRequest): AdminAuthContext {
  const auth = requireAccessAuth(request, { allowedRoles: ['admin', 'sub_admin'] });
  const role = auth.role as 'admin' | 'sub_admin';

  return {
    userId: auth.userId,
    role,
    email: auth.email,
  };
}
