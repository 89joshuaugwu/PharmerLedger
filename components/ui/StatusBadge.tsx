import { cn } from "@/lib/utils";

export type BadgeStatus =
  | "in_stock" | "low_stock" | "out_of_stock"
  | "expiring_soon" | "expired" | "ok"
  | "fulfilled" | "pending" | "partially_fulfilled"
  | "active" | "inactive";

const config: Record<BadgeStatus, { label: string; classes: string; pulse?: boolean }> = {
  in_stock: { label: "In Stock", classes: "bg-green-50 text-success" },
  low_stock: { label: "Low Stock", classes: "bg-amber-50 text-warning", pulse: true },
  out_of_stock: { label: "Out of Stock", classes: "bg-red-50 text-error" },
  ok: { label: "OK", classes: "bg-green-50 text-success" },
  expiring_soon: { label: "Expiring Soon", classes: "bg-amber-50 text-warning", pulse: true },
  expired: { label: "Expired", classes: "bg-red-50 text-error" },
  fulfilled: { label: "Fulfilled", classes: "bg-green-50 text-success" },
  pending: { label: "Pending", classes: "bg-blue-50 text-accent" },
  partially_fulfilled: { label: "Partially Fulfilled", classes: "bg-amber-50 text-warning" },
  active: { label: "Active", classes: "bg-green-50 text-success" },
  inactive: { label: "Deactivated", classes: "bg-red-50 text-error" },
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        c.classes,
        c.pulse && "pl-pulse"
      )}
    >
      {c.label}
    </span>
  );
}
