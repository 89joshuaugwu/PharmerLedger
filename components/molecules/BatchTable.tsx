"use client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNaira, formatDate } from "@/lib/utils";
import { getExpiryStatus, type Batch } from "@/types/drug";

/**
 * Sorted by expiryDate ascending — this visual order IS the FEFO deduction
 * order: the batch shown first is the batch deductStockFEFO() will draw
 * from first. Keep this in sync with lib/fefo.ts's orderBy("expiryDate","asc").
 */
export function BatchTable({ batches }: { batches: Batch[] }) {
  const sorted = [...batches].sort((a, b) => a.expiryDate - b.expiryDate);

  if (sorted.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">No batches yet. Add one below.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-bg">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-text-secondary">Batch Number</th>
            <th className="px-4 py-3 text-left font-semibold text-text-secondary">Expiry Date</th>
            <th className="px-4 py-3 text-left font-semibold text-text-secondary">Quantity</th>
            <th className="px-4 py-3 text-left font-semibold text-text-secondary">Cost Price</th>
            <th className="px-4 py-3 text-left font-semibold text-text-secondary">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b, i) => {
            const status = getExpiryStatus(b.expiryDate);
            return (
              <tr key={b.id} className={i % 2 === 1 ? "bg-bg/50" : ""}>
                <td className="px-4 py-3 font-mono text-xs text-text-primary">{b.batchNumber}</td>
                <td className="px-4 py-3 tabular-nums text-text-primary">{formatDate(b.expiryDate)}</td>
                <td className="px-4 py-3 tabular-nums text-text-primary">{b.quantity}</td>
                <td className="px-4 py-3 tabular-nums text-text-primary">{formatNaira(b.costPrice)}</td>
                <td className="px-4 py-3"><StatusBadge status={status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-border bg-bg px-4 py-2 text-xs text-text-secondary">
        ↑ This order is the FEFO deduction order — first row deducts first.
      </p>
    </div>
  );
}
