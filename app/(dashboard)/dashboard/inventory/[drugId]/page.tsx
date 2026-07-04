"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { doc, onSnapshot, collection, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import { BatchTable } from "@/components/molecules/BatchTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatNaira } from "@/lib/utils";
import { addBatch, mapDrugDoc } from "@/lib/drugs";
import { useAuth } from "@/lib/AuthContext";
import { getStockStatus, getExpiryStatus, type Drug, type Batch } from "@/types/drug";

export default function DrugDetailPage() {
  const { drugId } = useParams<{ drugId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [drug, setDrug] = useState<Drug | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [batchForm, setBatchForm] = useState({ batchNumber: "", expiryDate: "", quantity: 0, costPrice: 0 });

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const unsubDrug = onSnapshot(doc(db, "drugs", drugId), (snap) => {
      if (snap.exists()) setDrug(mapDrugDoc(snap.id, snap.data()));
    });
    const unsubBatches = onSnapshot(query(collection(db, "drugs", drugId, "batches")), (snap) => {
      setBatches(
        snap.docs.map((d) => ({
          id: d.id,
          drugId,
          batchNumber: d.data().batchNumber,
          expiryDate: d.data().expiryDate?.toMillis?.() ?? 0,
          quantity: d.data().quantity,
          costPrice: d.data().costPrice,
          receivedAt: d.data().receivedAt?.toMillis?.() ?? 0,
        }))
      );
    });
    return () => { unsubDrug(); unsubBatches(); };
  }, [drugId]);

  async function handleAddBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!batchForm.expiryDate) return;
    setSaving(true);
    try {
      await addBatch(drugId, {
        batchNumber: batchForm.batchNumber,
        expiryDate: new Date(batchForm.expiryDate).getTime(),
        quantity: batchForm.quantity,
        costPrice: batchForm.costPrice,
      });
      toast.success("Batch added.");
      setBatchModalOpen(false);
      setBatchForm({ batchNumber: "", expiryDate: "", quantity: 0, costPrice: 0 });
    } catch {
      toast.error("Could not add batch. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!drug) return <FullPageSpinner />;

  const stockStatus = getStockStatus(drug.totalStock, drug.reorderThreshold);
  const expiryStatus = getExpiryStatus(drug.nearestExpiry);

  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => router.back()} className="w-fit text-sm text-text-secondary hover:text-text-primary">
        ← Back to inventory
      </button>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary">{drug.name}</h1>
            <p className="text-sm text-text-secondary">{drug.genericName} · {drug.category} · {drug.form}</p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={stockStatus} />
            {expiryStatus !== "ok" && <StatusBadge status={expiryStatus} />}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div><p className="text-text-secondary">Total Stock</p><p className="tabular-nums font-semibold">{drug.totalStock} units</p></div>
          <div><p className="text-text-secondary">Reorder Threshold</p><p className="tabular-nums font-semibold">{drug.reorderThreshold}</p></div>
          <div><p className="text-text-secondary">Selling Price</p><p className="tabular-nums font-semibold">{formatNaira(drug.sellingPrice)}</p></div>
          <div><p className="text-text-secondary">Supplier</p><p className="font-semibold">{drug.supplier}</p></div>
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Batches (FEFO order)</h2>
          {isAdmin && <Button onClick={() => setBatchModalOpen(true)}>+ Add batch</Button>}
        </div>
        <BatchTable batches={batches} />
      </div>

      <Modal open={batchModalOpen} onClose={() => setBatchModalOpen(false)} title="Add Batch">
        <form onSubmit={handleAddBatch} className="flex flex-col gap-4">
          <Input label="Batch Number" required value={batchForm.batchNumber} onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })} />
          <DatePicker label="Expiry Date" required value={batchForm.expiryDate} min={new Date().toISOString().slice(0, 10)} onChange={(v) => setBatchForm({ ...batchForm, expiryDate: v })} />
          <Input label="Quantity" type="number" min={1} required value={batchForm.quantity} onChange={(e) => setBatchForm({ ...batchForm, quantity: Number(e.target.value) })} />
          <Input label="Cost Price (₦)" type="number" min={0} step="0.01" required value={batchForm.costPrice} onChange={(e) => setBatchForm({ ...batchForm, costPrice: Number(e.target.value) })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setBatchModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Batch</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
