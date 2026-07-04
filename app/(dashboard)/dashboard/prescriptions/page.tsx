"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { cn, formatDate } from "@/lib/utils";
import { mapPrescriptionDoc } from "@/lib/prescriptions";
import type { Prescription } from "@/types/prescription";

export default function PrescriptionsPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[] | null>(null);
  const [tab, setTab] = useState<"pending" | "fulfilled">("pending");

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "prescriptions"), orderBy("createdAt", "desc")), (snap) => {
      setPrescriptions(snap.docs.map((d) => mapPrescriptionDoc(d.id, d.data())));
    });
    return () => unsub();
  }, []);

  if (!prescriptions) return <FullPageSpinner />;

  const filtered = prescriptions.filter((p) =>
    tab === "pending" ? p.status !== "fulfilled" : p.status === "fulfilled"
  );

  const columns: Column<Prescription>[] = [
    { key: "patient", header: "Patient", render: (p) => p.patientName },
    { key: "doctor", header: "Doctor", render: (p) => p.doctorName },
    { key: "items", header: "Items", render: (p) => `${p.items.length} item(s)` },
    { key: "date", header: "Date", render: (p) => formatDate(p.createdAt) },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Prescriptions</h1>
        <Link href="/dashboard/prescriptions/new"><Button>+ New Prescription</Button></Link>
      </div>

      <div className="flex gap-2">
        {(["pending", "fulfilled"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium capitalize",
              tab === t ? "border-primary bg-primary text-white" : "border-border bg-white text-text-secondary"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(p) => p.id}
        onRowClick={(p) => router.push(`/dashboard/prescriptions/${p.id}`)}
        emptyState={`No ${tab} prescriptions.`}
      />
    </div>
  );
}
