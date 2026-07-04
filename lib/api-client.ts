"use client";
// Client-side fetch wrapper that attaches the current Firebase ID token as
// a Bearer header — every /api/* route verifies this server-side via
// lib/api-auth.ts's requireActiveUser(). Never call the checkout/fulfill/
// create-user routes without going through this.
import { auth } from "./firebase";

export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  const token = await user.getIdToken();

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}
