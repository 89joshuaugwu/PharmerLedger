"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { ReceiptPreview } from "@/components/molecules/ReceiptPreview";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatNaira, formatDateTime } from "@/lib/utils";
import { mapSaleDoc } from "@/lib/sales";
import type { Sale, PaymentMethod } from "@/types/sale";

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "all">("all");
  const [selected, setSelected] = useState<Sale | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "sales"), orderBy("createdAt", "desc")), (snap) => {
      setSales(snap.docs.map((d) => mapSaleDoc(d.id, d.data())));
    });
    return () => unsub();
  }, []);

  if (!sales) return <FullPageSpinner />;

  const filtered = sales.filter((s) => methodFilter === "all" || s.paymentMethod === methodFilter);

  const columns: Column<Sale>[] = [
    { key: "id", header: "Sale ID", render: (s) => <span className="font-mono text-xs">{s.id.slice(0, 8).toUpperCase()}</span> },
    { key: "type", header: "Type", render: (s) => <span className="capitalize">{s.type}</span> },
    { key: "patient", header: "Patient", render: (s) => s.patientName ?? "Walk-in" },
    { key: "items", header: "Items", render: (s) => s.items.length },
    { key: "total", header: "Total", className: "tabular-nums", render: (s) => formatNaira(s.total) },
    { key: "method", header: "Payment", render: (s) => <span className="capitalize">{s.paymentMethod}</span> },
    { key: "date", header: "Date", render: (s) => formatDateTime(s.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text-primary">Sales History</h1>
      <Select
        label="Filter by payment method"
        value={methodFilter}
        onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | "all")}
        options={[{ value: "all", label: "All" }, { value: "cash", label: "Cash" }, { value: "card", label: "Card" }, { value: "transfer", label: "Transfer" }]}
        className="md:w-56"
      />
      <DataTable columns={columns} rows={filtered} rowKey={(s) => s.id} onRowClick={setSelected} emptyState="No sales recorded yet." />
      <ReceiptPreview sale={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
