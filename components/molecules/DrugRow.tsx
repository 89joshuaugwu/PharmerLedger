"use client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNaira, formatDate } from "@/lib/utils";
import { getStockStatus, getExpiryStatus, type Drug } from "@/types/drug";

/** Mobile card view for a single drug — used by InventoryTable's DataTable mobileCard prop. */
export function DrugRow({ drug }: { drug: Drug }) {
  const stockStatus = getStockStatus(drug.totalStock, drug.reorderThreshold);
  const expiryStatus = getExpiryStatus(drug.nearestExpiry);

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-text-primary">{drug.name}</p>
          <p className="text-xs text-text-secondary">{drug.category} · {drug.form}</p>
        </div>
        <StatusBadge status={stockStatus} />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="tabular-nums text-text-primary">{drug.totalStock} units</span>
        <span className="tabular-nums text-text-secondary">{formatNaira(drug.sellingPrice)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-text-secondary">Expiry: {formatDate(drug.nearestExpiry)}</span>
        {expiryStatus !== "ok" && <StatusBadge status={expiryStatus} />}
      </div>
    </div>
  );
}
