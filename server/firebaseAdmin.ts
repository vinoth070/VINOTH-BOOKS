import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert, App } from 'firebase-admin/app';
import { getAuth as getAdminAuth, Auth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';

interface FirebaseAdminState {
  adminApp: App | null;
  adminAuth: Auth | null;
  adminFirestore: Firestore | null;
  isConnected: boolean;
  serviceAccountEmail: string | null;
  projectId: string;
  databaseId: string;
  initError: string | null;
}

let cachedState: FirebaseAdminState | null = null;

export function initializeFirebaseAdmin(): FirebaseAdminState {
  if (cachedState) {
    return cachedState;
  }

  let adminApp: App | null = null;
  let adminAuth: Auth | null = null;
  let adminFirestore: Firestore | null = null;
  let isConnected = false;
  let serviceAccountEmail: string | null = null;
  let initError: string | null = null;

  // 1. Determine project ID and database ID from config or env
  let projectId = process.env.FIREBASE_PROJECT_ID || '';
  let databaseId = process.env.FIRESTORE_DATABASE_ID || '';

  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (!projectId && raw.projectId) projectId = raw.projectId;
      if (!databaseId && raw.firestoreDatabaseId) databaseId = raw.firestoreDatabaseId;
    } catch (e: any) {
      console.warn('[Firebase Admin] Warning reading firebase-applet-config.json:', e.message);
    }
  }

  // 2. Parse service account credentials if provided via env
  let serviceAccount: any = null;
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (rawKey && rawKey.trim()) {
    try {
      const trimmed = rawKey.trim();
      const decoded = trimmed.startsWith('{')
        ? trimmed
        : Buffer.from(trimmed, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
      console.log(`[Firebase Admin] Successfully parsed FIREBASE_SERVICE_ACCOUNT_KEY JSON.`);
    } catch (parseErr: any) {
      initError = `Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${parseErr.message}`;
      console.error(`[Firebase Admin] ${initError}`);
    }
  } else if (clientEmail && privateKey) {
    // Alternative standard Render environment setup
    serviceAccount = {
      client_email: clientEmail.trim(),
      private_key: privateKey.replace(/\\n/g, '\n'),
      project_id: projectId || process.env.FIREBASE_PROJECT_ID
    };
    console.log(`[Firebase Admin] Using FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY.`);
  }

  // 3. Initialize Firebase Admin App safely
  try {
    const existingApps = getAdminApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
      console.log('[Firebase Admin] Reusing existing admin app instance.');
    } else if (serviceAccount) {
      adminApp = initAdminApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
      serviceAccountEmail = serviceAccount.client_email;
      isConnected = true;
      console.log(`[Firebase Admin] Successfully initialized with service account: ${serviceAccount.client_email}`);
    } else {
      // On Render or standalone server without Google Cloud environment credentials,
      // DO NOT call initAdminApp() with default credentials because that triggers the fatal:
      // "Could not load the default credentials. No ADC credentials found."
      console.log('[Firebase Admin] Notice: No service account credentials supplied. Backend will operate in resilient local mode with verified token verification.');
    }

    if (adminApp) {
      adminAuth = getAdminAuth(adminApp);
      try {
        if (databaseId) {
          adminFirestore = getAdminFirestore(adminApp, databaseId);
        } else {
          adminFirestore = getAdminFirestore(adminApp);
        }
        isConnected = true;
        console.log(`[Firebase Admin] Cloud Firestore client active on database: ${databaseId || 'default'}`);
      } catch (fsErr: any) {
        console.warn(`[Firebase Admin] Firestore client notice (using local storage fallback): ${fsErr.message}`);
      }
    }
  } catch (err: any) {
    initError = err.message;
    console.error(`[Firebase Admin] Initialization error caught (server protected from crash): ${err.message}`);
  }

  cachedState = {
    adminApp,
    adminAuth,
    adminFirestore,
    isConnected,
    serviceAccountEmail,
    projectId,
    databaseId,
    initError
  };

  return cachedState;
}
