/**
 * Validate required server-side env vars.
 */
export function assertServerEnv(): void {
  const required = [
    'JWT_SECRET',
    'OTP_SECRET',
    'ENCRYPTION_KEY',
    'PAYSTACK_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Validate required Firebase server-side env vars.
 */
export function assertFirebaseEnv(): void {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_DATABASE_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required Firebase environment variables: ${missing.join(', ')}`);
  }

  try {
    const databaseUrl = new URL(process.env.FIREBASE_DATABASE_URL!);
    if (!['http:', 'https:'].includes(databaseUrl.protocol)) {
      throw new Error('FIREBASE_DATABASE_URL must use http or https');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid URL';
    throw new Error(`Invalid FIREBASE_DATABASE_URL: ${message}`);
  }
}
