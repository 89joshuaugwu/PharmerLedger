export type PrescriptionStatus = "pending" | "partially_fulfilled" | "fulfilled";

export interface PrescriptionItem {
  drugId: string;
  drugName: string;
  dosage: string;
  quantity: number;
  quantityFulfilled?: number;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  items: PrescriptionItem[];
  status: PrescriptionStatus;
  fulfilledBy: string | null;
  fulfilledAt: number | null;
  createdAt: number;
}
