"use client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { Prescription, PrescriptionItem } from "@/types/prescription";

export interface NewPrescriptionInput {
  patientId: string;
  patientName: string;
  doctorName: string;
  items: PrescriptionItem[];
}

export async function createPrescription(input: NewPrescriptionInput): Promise<string> {
  const ref = await addDoc(collection(db, "prescriptions"), {
    ...input,
    status: "pending",
    fulfilledBy: null,
    fulfilledAt: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function mapPrescriptionDoc(id: string, data: any): Prescription {
  return {
    id,
    patientId: data.patientId,
    patientName: data.patientName,
    doctorName: data.doctorName,
    items: data.items ?? [],
    status: data.status,
    fulfilledBy: data.fulfilledBy ?? null,
    fulfilledAt: data.fulfilledAt?.toMillis?.() ?? null,
    createdAt: data.createdAt?.toMillis?.() ?? 0,
  };
}
