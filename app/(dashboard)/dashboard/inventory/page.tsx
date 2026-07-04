"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { InventoryTable } from "@/components/organisms/InventoryTable";
import { Button } from "@/components/ui/Button";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { mapDrugDoc } from "@/lib/drugs";
import { useAuth } from "@/lib/AuthContext";
import type { Drug } from "@/types/drug";

function InventoryContent() {
  const { user } = useAuth();
  const [drugs, setDrugs] = useState<Drug[] | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "drugs"), orderBy("name", "asc")), (snap) => {
      setDrugs(snap.docs.map((d) => mapDrugDoc(d.id, d.data())));
    });
    return () => unsub();
  }, []);

  if (!drugs) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Inventory</h1>
        {user?.role === "admin" && (
          <Link href="/dashboard/inventory/new"><Button>+ Add Drug</Button></Link>
        )}
      </div>
      <InventoryTable drugs={drugs} />
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <InventoryContent />
    </Suspense>
  );
}
