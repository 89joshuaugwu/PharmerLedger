"use client";

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { AppUser } from "@/types/user";

export class AccountDeactivatedError extends Error {
  constructor() {
    super("Your account has been deactivated. Contact your administrator.");
    this.name = "AccountDeactivatedError";
  }
}

/**
 * Email/password login only — matches CONTEXT.md's "staff added by admin only"
 * model. No signup, no Google OAuth. Checks /users/{uid}.active and signs the
 * user back out immediately if the account has been deactivated.
 */
export async function loginWithEmail(email: string, password: string): Promise<AppUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const userSnap = await getDoc(doc(db, "users", cred.user.uid));

  if (!userSnap.exists()) {
    await firebaseSignOut(auth);
    throw new Error("No staff profile found for this account. Contact your administrator.");
  }

  const data = userSnap.data();
  if (data.active !== true) {
    await firebaseSignOut(auth);
    throw new AccountDeactivatedError();
  }

  // Lightweight cookie for middleware.ts's redirect check — see the note
  // there on why this is a UX convenience, not the security boundary.
  document.cookie = "pl_session=1; path=/; max-age=2592000; SameSite=Lax";

  return {
    uid: cred.user.uid,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    active: data.active,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
  };
}

export async function logout(): Promise<void> {
  await firebaseSignOut(auth);
  document.cookie = "pl_session=; path=/; max-age=0";
}

export function watchAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function fetchAppUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    active: data.active,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
  };
}

// Used once, manually, for the bootstrap admin — see README "First admin account".
export async function createUserDoc(uid: string, data: Omit<AppUser, "uid" | "createdAt">) {
  await setDoc(doc(db, "users", uid), { ...data, createdAt: serverTimestamp() });
}
