"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { createDrug } from "@/lib/drugs";
import { useAuth } from "@/lib/AuthContext";
import type { DrugForm } from "@/types/drug";

const FORM_OPTIONS: { value: DrugForm; label: string }[] = [
  { value: "tablet", label: "Tablet" },
  { value: "syrup", label: "Syrup" },
  { value: "injection", label: "Injection" },
  { value: "capsule", label: "Capsule" },
  { value: "cream", label: "Cream" },
  { value: "other", label: "Other" },
];

export default function NewDrugPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", genericName: "", category: "", form: "tablet" as DrugForm,
    reorderThreshold: 20, sellingPrice: 0, supplier: "",
  });

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      toast.error("Only admins can add drugs.");
      router.replace("/dashboard/inventory");
    }
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const id = await createDrug(form);
      toast.success("Drug added. Now add a batch to give it stock.");
      router.push(`/dashboard/inventory/${id}`);
    } catch {
      toast.error("Could not add drug. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-text-primary">Add Drug</h1>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Generic Name" required value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} />
          <Input label="Category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Select label="Form" options={FORM_OPTIONS} value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value as DrugForm })} />
          <Input label="Reorder Threshold" type="number" min={0} required value={form.reorderThreshold} onChange={(e) => setForm({ ...form, reorderThreshold: Number(e.target.value) })} />
          <Input label="Selling Price (₦)" type="number" min={0} step="0.01" required value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} />
          <Input label="Supplier" required value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Drug</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
