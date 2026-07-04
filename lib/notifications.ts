// Notification writes fire inside the same server action that changes
// stock, not on a separate cron sweep — keeps alerts real-time and avoids
// needing a scheduled function on the Vercel free tier. SERVER-ONLY.
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";

export async function checkAndNotifyStockLevels(
  drugId: string,
  drugName: string,
  newTotalStock: number,
  reorderThreshold: number,
  adminUids: string[]
): Promise<void> {
  let type: "out_of_stock" | "low_stock" | null = null;
  let message = "";

  if (newTotalStock === 0) {
    type = "out_of_stock";
    message = `${drugName} is now out of stock.`;
  } else if (newTotalStock <= reorderThreshold) {
    type = "low_stock";
    message = `${drugName} is low: ${newTotalStock} units left.`;
  }

  if (!type || adminUids.length === 0) return;

  const batch = adminDb.batch();
  adminUids.forEach((uid) => {
    const ref = adminDb.collection("notifications").doc(uid).collection("items").doc();
    batch.set(ref, { type, drugId, message, read: false, createdAt: Timestamp.now() });
  });
  await batch.commit();
}

export async function notifyAllergyFlagged(
  message: string,
  drugId: string | null,
  adminUids: string[]
): Promise<void> {
  if (adminUids.length === 0) return;
  const batch = adminDb.batch();
  adminUids.forEach((uid) => {
    const ref = adminDb.collection("notifications").doc(uid).collection("items").doc();
    batch.set(ref, {
      type: "allergy_flagged",
      drugId,
      message,
      read: false,
      createdAt: Timestamp.now(),
    });
  });
  await batch.commit();
}

export async function getActiveAdminUids(): Promise<string[]> {
  const snap = await adminDb.collection("users").where("role", "==", "admin").where("active", "==", true).get();
  return snap.docs.map((d) => d.id);
}

/**
 * Expiry check — run on app load / dashboard fetch, not a background cron
 * (Vercel free tier has very limited Cron Job minutes, and expiry data
 * doesn't need second-by-second freshness). Client-side helper using the
 * regular Firestore SDK via a collectionGroup query.
 */
export const EXPIRY_WINDOW_DAYS = 30;
