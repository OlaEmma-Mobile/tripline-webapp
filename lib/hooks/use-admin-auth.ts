'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  adminLoginClientSchema,
} from '@/lib/frontend-validation/admin-auth.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { useAdminAuthStore, type AdminRole } from '@/lib/stores/admin-auth-store';
import type { AdminAuthState } from '@/lib/stores/admin-auth-store';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface AdminLoginPayload {
  email: string;
  password: string;
}

interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  role: AdminRole;
  account_status: string;
}

interface AdminRefreshResponse {
  accessToken: string;
  refreshToken: string;
  role: AdminRole;
}

/**
 * Admin login mutation backed by /api/admin/auth/login.
 */
export function useAdminLoginMutation() {
  const setSession = useAdminAuthStore((state: AdminAuthState) => state.setSession);

  return useMutation({
    mutationFn: async (payload: AdminLoginPayload): Promise<AdminLoginResponse> => {
      const validation = validateOrReject(adminLoginClientSchema, payload, 'Enter valid login credentials.');
      if (!validation.isValid) {
        throw new Error(validation.formMessage ?? 'Invalid login payload');
      }

      const response = await apiRequest<AdminLoginResponse>('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify(validation.data),
        skipAuth: true,
      });

      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Login failed');
      }

      return response.data;
    },
    onSuccess: (data: AdminLoginResponse) => {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.role,
      });
    },
  });
}

/**
 * Admin refresh mutation backed by /api/admin/auth/refresh.
 */
export function useAdminRefreshMutation() {
  const refreshToken = useAdminAuthStore((state: AdminAuthState) => state.refreshToken);
  const setSession = useAdminAuthStore((state: AdminAuthState) => state.setSession);
  const clearSession = useAdminAuthStore((state: AdminAuthState) => state.clearSession);

  return useMutation({
    mutationFn: async (): Promise<AdminRefreshResponse> => {
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiRequest<AdminRefreshResponse>('/api/admin/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        skipAuth: true,
      });

      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Session refresh failed');
      }

      return response.data;
    },
    onSuccess: (data: AdminRefreshResponse) => {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.role,
      });
    },
    onError: () => {
      clearSession();
    },
  });
}

/**
 * Validates current admin token via /api/users/me and auto-refreshes once when needed.
 */
export function useAdminSessionQuery() {
  const hydrated = useAdminAuthStore((state: AdminAuthState) => state.hydrated);
  const accessToken = useAdminAuthStore((state: AdminAuthState) => state.accessToken);
  const refreshToken = useAdminAuthStore((state: AdminAuthState) => state.refreshToken);
  const setSession = useAdminAuthStore((state: AdminAuthState) => state.setSession);
  const clearSession = useAdminAuthStore((state: AdminAuthState) => state.clearSession);

  return useQuery({
    queryKey: [...adminQueryKeys.session, accessToken],
    enabled: hydrated,
    queryFn: async (): Promise<{ role: AdminRole }> => {
      if (!accessToken) {
        throw new Error('Unauthenticated');
      }

      const meResponse = await apiRequest<{ role: string }>('/api/users/me', {
        token: accessToken,
      });

      if (!meResponse.hasError && meResponse.data) {
        const role = meResponse.data.role;
        if (role === 'admin' || role === 'sub_admin') {
          return { role };
        }
        clearSession();
        throw new Error('Forbidden');
      }

      if (!refreshToken) {
        clearSession();
        throw new Error(meResponse.message || 'Unauthenticated');
      }

      const refreshResponse = await apiRequest<AdminRefreshResponse>('/api/admin/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        skipAuth: true,
      });

      if (refreshResponse.hasError || !refreshResponse.data) {
        clearSession();
        throw new Error(refreshResponse.message || 'Session refresh failed');
      }

      setSession({
        accessToken: refreshResponse.data.accessToken,
        refreshToken: refreshResponse.data.refreshToken,
        role: refreshResponse.data.role,
      });

      const secondMe = await apiRequest<{ role: string }>('/api/users/me', {
        token: refreshResponse.data.accessToken,
      });

      if (secondMe.hasError || !secondMe.data) {
        clearSession();
        throw new Error(secondMe.message || 'Unauthenticated');
      }

      if (secondMe.data.role !== 'admin' && secondMe.data.role !== 'sub_admin') {
        clearSession();
        throw new Error('Forbidden');
      }

      return { role: secondMe.data.role as AdminRole };
    },
  });
}
