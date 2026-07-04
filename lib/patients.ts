"use client";
import { collection, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { Patient } from "@/types/patient";

export interface NewPatientInput {
  name: string;
  phone: string;
  dob: string | null;
  address: string;
  allergies: string[];
}

export async function createPatient(input: NewPatientInput): Promise<string> {
  const ref = await addDoc(collection(db, "patients"), { ...input, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updatePatientAllergies(patientId: string, allergies: string[]): Promise<void> {
  await updateDoc(doc(db, "patients", patientId), { allergies });
}

export function mapPatientDoc(id: string, data: any): Patient {
  return {
    id, name: data.name, phone: data.phone, dob: data.dob ?? null,
    address: data.address ?? "", allergies: data.allergies ?? [],
    createdAt: data.createdAt?.toMillis?.() ?? 0,
  };
}
