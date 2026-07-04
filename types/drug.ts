export type DrugForm = "tablet" | "syrup" | "injection" | "capsule" | "cream" | "other";

export interface Drug {
  id: string;
  name: string;
  genericName: string;
  category: string;
  form: DrugForm;
  reorderThreshold: number;
  sellingPrice: number;
  supplier: string;
  totalStock: number;
  nearestExpiry: number | null; // epoch ms, denormalized
  createdAt: number;
  updatedAt: number;
}

export interface Batch {
  id: string;
  drugId: string;
  batchNumber: string;
  expiryDate: number; // epoch ms
  quantity: number;
  costPrice: number;
  receivedAt: number;
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type ExpiryStatus = "ok" | "expiring_soon" | "expired";

export function getStockStatus(totalStock: number, reorderThreshold: number): StockStatus {
  if (totalStock <= 0) return "out_of_stock";
  if (totalStock <= reorderThreshold) return "low_stock";
  return "in_stock";
}

export function getExpiryStatus(expiryDate: number | null, windowDays = 30): ExpiryStatus {
  if (!expiryDate) return "ok";
  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  if (expiryDate <= now) return "expired";
  if (expiryDate - now <= windowMs) return "expiring_soon";
  return "ok";
}
