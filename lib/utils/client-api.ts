'use client';

import type { ApiResponse } from '@/lib/utils/response-types';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

interface ApiRequestOptions extends RequestInit {
  token?: string | null;
  skipAuth?: boolean;
  timeoutMs?: number;
}

interface RawApiResult<T> {
  status: number;
  payload: ApiResponse<T>;
}

const AUTH_REFRESH_PATH = '/api/admin/auth/refresh';

function buildHeaders(init: ApiRequestOptions, token: string | null): Headers {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function executeRequest<T>(
  path: string,
  init: ApiRequestOptions,
  token: string | null
): Promise<RawApiResult<T>> {
  const timeoutMs = init.timeoutMs ?? 20000;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: buildHeaders(init, token),
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = {
      hasError: true,
      data: null,
      message: 'Request failed',
      description: 'Unable to parse server response',
      errors: {},
    };
  }

  return {
    status: response.status,
    payload,
  };
}

async function refreshAdminSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = window.localStorage.getItem('adminRefreshToken');
  if (!refreshToken) return null;

  const result = await executeRequest<{
    accessToken: string;
    refreshToken: string;
    role: 'admin' | 'sub_admin';
  }>(
    AUTH_REFRESH_PATH,
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      skipAuth: true,
    },
    null
  );

  if (result.payload.hasError || !result.payload.data) {
    useAdminAuthStore.getState().clearSession();
    return null;
  }

  useAdminAuthStore.getState().setSession({
    accessToken: result.payload.data.accessToken,
    refreshToken: result.payload.data.refreshToken,
    role: result.payload.data.role,
  });

  return result.payload.data.accessToken;
}

/**
 * Performs an authenticated API request from client components.
 */
export async function apiRequest<T>(
  path: string,
  init: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const token =
    init.token ??
    (typeof window !== 'undefined' && !init.skipAuth ? window.localStorage.getItem('accessToken') : null);

  const first = await executeRequest<T>(path, init, token);
  const isUnauthorized = first.status === 401 || first.payload.message?.toLowerCase().includes('token');
  const canRetryWithRefresh =
    !init.skipAuth && path !== AUTH_REFRESH_PATH && isUnauthorized && typeof window !== 'undefined';

  if (!canRetryWithRefresh) {
    return first.payload;
  }

  const refreshedAccessToken = await refreshAdminSession();
  if (!refreshedAccessToken) {
    return first.payload;
  }

  const second = await executeRequest<T>(path, init, refreshedAccessToken);
  return second.payload;
}
