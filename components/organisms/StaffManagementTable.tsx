"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AppUser } from "@/types/user";

interface StaffManagementTableProps {
  staff: AppUser[];
  currentUid: string;
}

export function StaffManagementTable({ staff, currentUid }: StaffManagementTableProps) {
  const [busyUid, setBusyUid] = useState<string | null>(null);

  async function toggleActive(u: AppUser) {
    if (u.uid === currentUid) {
      toast.error("You can't deactivate your own account.");
      return;
    }
    setBusyUid(u.uid);
    try {
      // Deactivating blocks login (checked in lib/auth.ts) without deleting
      // any historical sales/prescription records tied to this uid.
      await updateDoc(doc(db, "users", u.uid), { active: !u.active });
      toast.success(u.active ? `${u.displayName} deactivated.` : `${u.displayName} reactivated.`);
    } catch {
      toast.error("Could not update staff status.");
    } finally {
      setBusyUid(null);
    }
  }

  const columns: Column<AppUser>[] = [
    { key: "name", header: "Name", render: (u) => u.displayName },
    { key: "email", header: "Email", render: (u) => u.email },
    { key: "role", header: "Role", render: (u) => <span className="capitalize">{u.role}</span> },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.active ? "active" : "inactive"} /> },
    {
      key: "action",
      header: "",
      render: (u) => (
        <button
          onClick={() => toggleActive(u)}
          disabled={busyUid === u.uid || u.uid === currentUid}
          className="text-sm font-medium text-primary hover:underline disabled:opacity-40"
        >
          {u.active ? "Deactivate" : "Reactivate"}
        </button>
      ),
    },
  ];

  return <DataTable columns={columns} rows={staff} rowKey={(u) => u.uid} emptyState="No staff added yet." />;
}
