// Shared server-side helper for API routes: verifies the Firebase ID token
// sent from the client and confirms the matching /users/{uid} doc is
// active. Every /api/* route that touches stock, prescriptions, or staff
// accounts must call this first — never trust a uid passed in the request
// body, always derive it from a verified token.
import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "./firebase-admin";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface VerifiedCaller {
  uid: string;
  email: string;
  role: "admin" | "attendant";
  displayName: string;
}

export async function requireActiveUser(request: NextRequest): Promise<VerifiedCaller> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new UnauthorizedError("Missing auth token.");

  const decoded = await adminAuth.verifyIdToken(token).catch(() => {
    throw new UnauthorizedError("Invalid or expired session. Log in again.");
  });

  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userSnap.exists) throw new UnauthorizedError("No staff profile found.");

  const data = userSnap.data()!;
  if (data.active !== true) throw new UnauthorizedError("Account deactivated.");

  return { uid: decoded.uid, email: data.email, role: data.role, displayName: data.displayName };
}

export function requireAdmin(caller: VerifiedCaller): void {
  if (caller.role !== "admin") throw new UnauthorizedError("Admin access required.");
}
