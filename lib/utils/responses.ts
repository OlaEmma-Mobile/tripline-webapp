import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/utils/response-types';

/**
 * Standard API response wrapper.
 */
export function jsonResponse<T>(
  data: T | null,
  message = 'Success',
  description = '',
  status = 200,
  errors: Record<string, string[]> = {}
): NextResponse {
  const payload: ApiResponse<T> = {
    hasError: false,
    data,
    message,
    description,
    errors,
  };
  return NextResponse.json(payload, { status });
}

/**
 * Standard API error response wrapper.
 */
export function errorResponse(
  message: string,
  description = '',
  status = 400,
  errors: Record<string, string[]> = {}
): NextResponse {
  const payload: ApiResponse<null> = {
    hasError: true,
    data: null,
    message,
    description,
    errors,
  };
  return NextResponse.json(payload, { status });
}
