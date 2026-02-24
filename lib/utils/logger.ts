import type { NextRequest } from 'next/server';

type LogLevel = 'info' | 'warn' | 'error';

const REDACT_FIELDS = ['password', 'otp', 'verifyToken', 'refreshToken', 'accessToken', 'ninBvnNid', 'licenseNumber', 'token'];

/**
 * Determine if debug logging is enabled.
 */
export function isDebugLoggingEnabled(): boolean {
  return process.env.DEBUG_LOGGING === 'true';
}

/**
 * Log an incoming API request.
 */
export function logIncoming(request: NextRequest, body?: unknown): void {
  if (!isDebugLoggingEnabled()) return;
  log('info', 'Incoming request', {
    method: request.method,
    path: request.nextUrl.pathname,
    headers: Object.fromEntries(request.headers.entries()),
    query: Object.fromEntries(request.nextUrl.searchParams.entries()),
    body: redactSensitive(body),
  });
}

/**
 * Log internal step during request handling.
 */
export function logStep(step: string, meta?: Record<string, unknown>): void {
  if (!isDebugLoggingEnabled()) return;
  log('info', `Step: ${step}`, { meta: redactSensitive(meta) });
}

/**
 * Log outgoing response payload.
 */
export function logOutgoing(status: number, responseBody?: unknown): void {
  if (!isDebugLoggingEnabled()) return;
  log('info', 'Outgoing response', { status, body: redactSensitive(responseBody) });
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  console.log("================", message.toUpperCase(), " ===================")
  console.log({payload});
  console.log("===============================================================")
  console.log('\n\n');

}

function redactSensitive(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map(redactSensitive);

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (REDACT_FIELDS.includes(key)) {
      output[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      output[key] = redactSensitive(value);
    } else {
      output[key] = value;
    }
  }
  return output;
}
