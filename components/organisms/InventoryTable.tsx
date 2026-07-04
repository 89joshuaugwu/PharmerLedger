"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Input } from "@/components/ui/Input";
import { DrugRow } from "@/components/molecules/DrugRow";
import { formatNaira, formatDate } from "@/lib/utils";
import { getStockStatus, getExpiryStatus, type Drug } from "@/types/drug";
import { cn } from "@/lib/utils";

interface InventoryTableProps {
  drugs: Drug[];
}

export function InventoryTable({ drugs }: InventoryTableProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const activeFilter = params.get("filter");

  const categories = useMemo(() => Array.from(new Set(drugs.map((d) => d.category))).sort(), [drugs]);
  const [category, setCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return drugs.filter((d) => {
      const matchesSearch =
        !search ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.genericName.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !category || d.category === category;

      const stockStatus = getStockStatus(d.totalStock, d.reorderThreshold);
      const expiryStatus = getExpiryStatus(d.nearestExpiry);
      const matchesFilter =
        !activeFilter ||
        (activeFilter === "expiring_soon" ? expiryStatus === "expiring_soon" : stockStatus === activeFilter);

      return matchesSearch && matchesCategory && matchesFilter;
    });
  }, [drugs, search, category, activeFilter]);

  const columns: Column<Drug>[] = [
    { key: "name", header: "Drug Name", render: (d) => (
        <div>
          <p className="font-medium text-text-primary">{d.name}</p>
          <p className="text-xs text-text-secondary">{d.genericName}</p>
        </div>
      ), sortValue: (d) => d.name },
    { key: "category", header: "Category", render: (d) => d.category },
    { key: "stock", header: "Total Stock", className: "tabular-nums", render: (d) => `${d.totalStock} units` },
    { key: "expiry", header: "Nearest Expiry", className: "tabular-nums", render: (d) => formatDate(d.nearestExpiry) },
    { key: "price", header: "Price", className: "tabular-nums", render: (d) => formatNaira(d.sellingPrice) },
    {
      key: "status",
      header: "Status",
      render: (d) => {
        const stockStatus = getStockStatus(d.totalStock, d.reorderThreshold);
        const expiryStatus = getExpiryStatus(d.nearestExpiry);
        return (
          <div className="flex flex-wrap gap-1">
            <StatusBadge status={stockStatus} />
            {expiryStatus !== "ok" && <StatusBadge status={expiryStatus} />}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input placeholder="Search by name or generic name…" value={search} onChange={(e) => setSearch(e.target.value)} className="md:w-72" />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", !category ? "border-primary bg-primary text-white" : "border-border bg-white text-text-secondary")}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", category === c ? "border-primary bg-primary text-white" : "border-border bg-white text-text-secondary")}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(d) => d.id}
        onRowClick={(d) => router.push(`/dashboard/inventory/${d.id}`)}
        mobileCard={(d) => <DrugRow drug={d} />}
        emptyState={search ? `No drugs match "${search}".` : "No drugs added yet."}
      />
    </div>
  );
}
