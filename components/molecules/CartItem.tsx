"use client";
import { Minus, Plus, X } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import type { CartLine } from "@/types/sale";

interface CartItemProps {
  line: CartLine;
  onQuantityChange: (drugId: string, quantity: number) => void;
  onRemove: (drugId: string) => void;
}

/** Batch is auto-assigned by FEFO server-side on confirm — shown here only as a note, not editable by the attendant. */
export function CartItem({ line, onQuantityChange, onRemove }: CartItemProps) {
  const overStock = line.quantity > line.availableStock;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-3 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">{line.drugName}</p>
        <p className="text-xs text-text-secondary">
          {formatNaira(line.sellingPrice)} · batch auto-assigned (FEFO)
        </p>
        {overStock && <p className="text-xs font-medium text-error">Only {line.availableStock} units available</p>}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onQuantityChange(line.drugId, Math.max(1, line.quantity - 1))} className="rounded p-1 hover:bg-bg">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
        <button onClick={() => onQuantityChange(line.drugId, line.quantity + 1)} className="rounded p-1 hover:bg-bg">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="w-20 text-right text-sm font-medium tabular-nums text-text-primary">
        {formatNaira(line.sellingPrice * line.quantity)}
      </span>
      <button onClick={() => onRemove(line.drugId)} aria-label="Remove item" className="text-text-secondary hover:text-error">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
