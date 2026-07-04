"use client";
// Client-side inventory CRUD. Admin-only writes, enforced both by
// firestore.rules AND by route guards in the UI (see inventory pages).
// Every batch write runs inside the same transaction that updates the
// parent drug's totalStock and nearestExpiry — never let these drift.
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Drug, DrugForm } from "@/types/drug";

export interface NewDrugInput {
  name: string;
  genericName: string;
  category: string;
  form: DrugForm;
  reorderThreshold: number;
  sellingPrice: number;
  supplier: string;
}

export async function createDrug(input: NewDrugInput): Promise<string> {
  const ref = await addDoc(collection(db, "drugs"), {
    ...input,
    totalStock: 0,
    nearestExpiry: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDrug(drugId: string, input: Partial<NewDrugInput>): Promise<void> {
  await updateDoc(doc(db, "drugs", drugId), { ...input, updatedAt: serverTimestamp() });
}

export interface NewBatchInput {
  batchNumber: string;
  expiryDate: number; // epoch ms
  quantity: number;
  costPrice: number;
}

/**
 * Adds a batch AND recomputes totalStock / nearestExpiry on the parent drug
 * doc in one transaction — per CONTEXT.md's denormalization rule. This is
 * a regular authenticated-admin client write (allowed by firestore.rules
 * for the /drugs and /batches collections), distinct from the FEFO
 * DEDUCTION transaction in lib/fefo.ts, which is server-only.
 */
export async function addBatch(drugId: string, input: NewBatchInput): Promise<void> {
  const drugRef = doc(db, "drugs", drugId);

  await runTransaction(db, async (tx) => {
    const batchRef = doc(collection(db, "drugs", drugId, "batches"));
    tx.set(batchRef, {
      ...input,
      expiryDate: Timestamp.fromMillis(input.expiryDate),
      receivedAt: serverTimestamp(),
    });

    const batchesSnap = await getDocs(
      query(collection(db, "drugs", drugId, "batches"), where("quantity", ">", 0))
    );

    let totalStock = input.quantity;
    let nearestExpiry: number | null = input.expiryDate;

    batchesSnap.docs.forEach((d) => {
      const b = d.data();
      totalStock += b.quantity as number;
      const expiryMs = (b.expiryDate as Timestamp).toMillis();
      if (nearestExpiry === null || expiryMs < nearestExpiry) nearestExpiry = expiryMs;
    });

    tx.update(drugRef, {
      totalStock,
      nearestExpiry: nearestExpiry ? Timestamp.fromMillis(nearestExpiry) : null,
      updatedAt: serverTimestamp(),
    });
  });
}

export function mapDrugDoc(id: string, data: FirebaseFirestore.DocumentData | any): Drug {
  return {
    id,
    name: data.name,
    genericName: data.genericName,
    category: data.category,
    form: data.form,
    reorderThreshold: data.reorderThreshold,
    sellingPrice: data.sellingPrice,
    supplier: data.supplier,
    totalStock: data.totalStock ?? 0,
    nearestExpiry: data.nearestExpiry?.toMillis?.() ?? null,
    createdAt: data.createdAt?.toMillis?.() ?? 0,
    updatedAt: data.updatedAt?.toMillis?.() ?? 0,
  };
}
