// Server-only Firebase Admin SDK. NEVER import this from a client component.
// Used exclusively inside /app/api/* route handlers.
//
// Initialization is lazy (via Proxy) rather than at module load time. Next.js
// evaluates route modules during `next build`'s page-data-collection step —
// if the Admin SDK were initialized eagerly here, a missing or malformed
// FIREBASE_ADMIN_* env var would fail the ENTIRE build, not just the request
// that needed it. Lazy init means the build always succeeds; a bad credential
// only surfaces as a real 500 when an API route actually runs.
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]!;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Vercel env vars store the private key with literal "\n" sequences —
  // they must be converted back to real newlines or the SDK throws
  // "Failed to parse private key" / app/invalid-credential.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars. Check FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

function lazyProxy<T extends object>(getInstance: () => T): T {
  let instance: T | null = null;
  return new Proxy({} as T, {
    get(_target, prop, _receiver) {
      if (!instance) instance = getInstance();
      const value = (instance as any)[prop];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

export const adminDb: Firestore = lazyProxy(() => getFirestore(getAdminApp()));
export const adminAuth: Auth = lazyProxy(() => getAuth(getAdminApp()));
