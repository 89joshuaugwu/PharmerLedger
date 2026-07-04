export type PaymentMethod = "cash" | "card" | "transfer";
export type SaleType = "otc" | "prescription";

export interface SaleItem {
  drugId: string;
  drugName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
}

export interface Sale {
  id: string;
  type: SaleType;
  prescriptionId: string | null;
  patientId: string | null;
  patientName: string | null;
  items: SaleItem[];
  total: number;
  paymentMethod: PaymentMethod;
  soldBy: string;
  soldByName: string;
  receiptUrl: string | null;
  createdAt: number;
}

export interface CartLine {
  drugId: string;
  drugName: string;
  sellingPrice: number;
  quantity: number;
  availableStock: number;
}
