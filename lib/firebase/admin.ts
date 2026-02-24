import admin from 'firebase-admin';
import { assertFirebaseEnv } from '@/lib/utils/env';

/**
 * Returns Firebase Admin singleton app instance.
 */
export function getFirebaseAdminApp() {
  assertFirebaseEnv();
  if (admin.apps.length > 0) {
    return admin.app();
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL!,
  });
}

/**
 * Returns Firebase Realtime Database client.
 */
export function getFirebaseDb() {
  return admin.database(getFirebaseAdminApp());
}

/**
 * Returns Firebase Cloud Messaging client.
 */
export function getFirebaseMessaging() {
  return admin.messaging(getFirebaseAdminApp());
}
