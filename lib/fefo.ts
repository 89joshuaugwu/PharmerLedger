// FEFO (First-Expiry-First-Out) stock deduction — the single most important
// piece of business logic in PharmaLedger. Runs identically for POS sales
// and prescription fulfillment. SERVER-ONLY: uses firebase-admin, must only
// be called from /app/api/* route handlers, never from a client component.
//
// per CONTEXT.md Section 3 — do not alter the deduction order or the
// transaction boundary. If anything ever suggests deducting stock via a
// client-side updateDoc() call, that is wrong: attendants have no direct
// write access to /drugs/{id}/batches per firestore.rules, and doing it
// client-side also loses the transactional guarantee against concurrent sales.
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";

export class InsufficientStockError extends Error {
  constructor(public available: number, public requested: number, public drugId?: string) {
    super(`Insufficient stock: requested ${requested}, only ${available} available.`);
    this.name = "InsufficientStockError";
  }
}

export interface DeductionResult {
  success: true;
  drugId: string;
  deductions: { batchId: string; batchNumber: string; quantityDeducted: number }[];
  newTotalStock: number;
  shortfall: 0;
}

async function recomputeTotalsInTx(tx: Transaction, drugRef: FirebaseFirestore.DocumentReference) {
  const batchesSnap = await tx.get(drugRef.collection("batches").where("quantity", ">", 0));
  let totalStock = 0;
  let nearestExpiry: number | null = null;

  batchesSnap.docs.forEach((d) => {
    const b = d.data();
    totalStock += b.quantity as number;
    const expiryMs = (b.expiryDate as Timestamp).toMillis();
    if (nearestExpiry === null || expiryMs < nearestExpiry) nearestExpiry = expiryMs;
  });

  return { totalStock, nearestExpiry };
}

/**
 * Deducts `requestedQty` units of `drugId` from batches ordered earliest-
 * expiry-first. Throws InsufficientStockError (aborting the transaction,
 * nothing written) if total available stock across all batches is short.
 *
 * Two attendants checking out the last units of a drug at the same POS
 * moment must not both succeed — the Firestore transaction guarantees the
 * second call re-reads fresh data and correctly fails rather than allowing
 * negative stock.
 */
export async function deductStockFEFO(drugId: string, requestedQty: number): Promise<DeductionResult> {
  return adminDb.runTransaction(async (tx) => {
    const drugRef = adminDb.collection("drugs").doc(drugId);
    const drugSnap = await tx.get(drugRef);
    if (!drugSnap.exists) throw new Error(`Drug ${drugId} does not exist.`);

    const batchesSnap = await tx.get(
      drugRef.collection("batches").where("quantity", ">", 0).orderBy("expiryDate", "asc")
    );

    let remaining = requestedQty;
    const deductions: DeductionResult["deductions"] = [];

    for (const batchDoc of batchesSnap.docs) {
      if (remaining <= 0) break;
      const batch = batchDoc.data();
      const deductAmount = Math.min(batch.quantity as number, remaining);

      tx.update(batchDoc.ref, { quantity: (batch.quantity as number) - deductAmount });
      deductions.push({
        batchId: batchDoc.id,
        batchNumber: batch.batchNumber as string,
        quantityDeducted: deductAmount,
      });
      remaining -= deductAmount;
    }

    if (remaining > 0) {
      // Nothing has been committed yet — Firestore transactions only apply
      // writes if the callback resolves. Throwing here aborts everything.
      throw new InsufficientStockError(requestedQty - remaining, requestedQty);
    }

    const { totalStock, nearestExpiry } = await recomputeTotalsInTx(tx, drugRef);
    tx.update(drugRef, {
      totalStock,
      nearestExpiry: nearestExpiry ? Timestamp.fromMillis(nearestExpiry) : null,
      updatedAt: Timestamp.now(),
    });

    return { success: true, drugId, deductions, newTotalStock: totalStock, shortfall: 0 };
  });
}

export interface MultiDeductionResult {
  success: true;
  perDrug: {
    drugId: string;
    deductions: { batchId: string; batchNumber: string; quantityDeducted: number }[];
    newTotalStock: number;
  }[];
}

/**
 * Cart-wide atomic FEFO deduction — used by /api/sales/checkout for OTC
 * sales. Unlike deductStockFEFO() (single drug, used by prescription
 * fulfillment where partial success per item is acceptable), this deducts
 * every line of a cart inside ONE Firestore transaction: all reads for
 * every drug happen first, then — only if every line has enough stock —
 * all writes commit together. If any single line is short, the whole
 * transaction throws before anything is written, so the cart is never
 * partially charged. This is what gives OTC checkout its hard-block
 * behavior (see CONTEXT.md Section 3's POS-vs-prescription distinction).
 */
export async function deductStockFEFOMulti(
  items: { drugId: string; quantity: number }[]
): Promise<MultiDeductionResult> {
  return adminDb.runTransaction(async (tx) => {
    interface Plan {
      drugId: string;
      drugRef: FirebaseFirestore.DocumentReference;
      deductions: { batchRef: FirebaseFirestore.DocumentReference; batchId: string; batchNumber: string; newQuantity: number; quantityDeducted: number }[];
      newTotalStock: number;
      newNearestExpiry: number | null;
    }
    const plans: Plan[] = [];

    // PHASE 1 — reads only. Firestore transactions require every read to
    // happen before any write is queued, so we resolve every drug's plan
    // here first and only start calling tx.update() in Phase 2.
    for (const item of items) {
      const drugRef = adminDb.collection("drugs").doc(item.drugId);
      const drugSnap = await tx.get(drugRef);
      if (!drugSnap.exists) throw new Error(`Drug ${item.drugId} does not exist.`);

      const batchesSnap = await tx.get(
        drugRef.collection("batches").where("quantity", ">", 0).orderBy("expiryDate", "asc")
      );

      let remaining = item.quantity;
      const deductions: Plan["deductions"] = [];
      const deductedByBatch = new Map<string, number>();

      for (const batchDoc of batchesSnap.docs) {
        if (remaining <= 0) break;
        const batch = batchDoc.data();
        const deductAmount = Math.min(batch.quantity as number, remaining);
        deductions.push({
          batchRef: batchDoc.ref,
          batchId: batchDoc.id,
          batchNumber: batch.batchNumber as string,
          newQuantity: (batch.quantity as number) - deductAmount,
          quantityDeducted: deductAmount,
        });
        deductedByBatch.set(batchDoc.id, deductAmount);
        remaining -= deductAmount;
      }

      if (remaining > 0) {
        // Abort before any writes — nothing for this cart has been committed.
        throw new InsufficientStockError(item.quantity - remaining, item.quantity, item.drugId);
      }

      let newTotalStock = 0;
      let newNearestExpiry: number | null = null;
      batchesSnap.docs.forEach((d) => {
        const b = d.data();
        const newQty = (b.quantity as number) - (deductedByBatch.get(d.id) ?? 0);
        if (newQty > 0) {
          newTotalStock += newQty;
          const expiryMs = (b.expiryDate as Timestamp).toMillis();
          if (newNearestExpiry === null || expiryMs < newNearestExpiry) newNearestExpiry = expiryMs;
        }
      });

      plans.push({ drugId: item.drugId, drugRef, deductions, newTotalStock, newNearestExpiry });
    }

    // PHASE 2 — every line had enough stock. Commit all writes together.
    plans.forEach((plan) => {
      plan.deductions.forEach((d) => tx.update(d.batchRef, { quantity: d.newQuantity }));
      tx.update(plan.drugRef, {
        totalStock: plan.newTotalStock,
        nearestExpiry: plan.newNearestExpiry ? Timestamp.fromMillis(plan.newNearestExpiry) : null,
        updatedAt: Timestamp.now(),
      });
    });

    return {
      success: true,
      perDrug: plans.map((p) => ({ drugId: p.drugId, deductions: p.deductions, newTotalStock: p.newTotalStock })),
    };
  });
}

/**
 * Reads live availability without deducting — used by Phase 4's
 * prescription detail view and the POS cart preview. Never call this and
 * then assume the stock is reserved; it is a read-only snapshot.
 */
export async function previewFEFO(drugId: string, requestedQty: number) {
  const drugRef = adminDb.collection("drugs").doc(drugId);
  const batchesSnap = await drugRef
    .collection("batches")
    .where("quantity", ">", 0)
    .orderBy("expiryDate", "asc")
    .get();

  let remaining = requestedQty;
  const assigned: { batchId: string; batchNumber: string; quantity: number }[] = [];
  let totalAvailable = 0;

  batchesSnap.docs.forEach((d) => {
    const b = d.data();
    totalAvailable += b.quantity as number;
    if (remaining > 0) {
      const take = Math.min(b.quantity as number, remaining);
      assigned.push({ batchId: d.id, batchNumber: b.batchNumber, quantity: take });
      remaining -= take;
    }
  });

  return { assigned, totalAvailable, sufficient: totalAvailable >= requestedQty };
}
