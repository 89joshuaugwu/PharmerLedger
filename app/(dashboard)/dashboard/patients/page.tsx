"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { createPatient, mapPatientDoc } from "@/lib/patients";
import { formatDate } from "@/lib/utils";
import type { Patient } from "@/types/patient";

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", dob: "", address: "" });

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "patients"), orderBy("name", "asc")), (snap) => {
      setPatients(snap.docs.map((d) => mapPatientDoc(d.id, d.data())));
    });
    return () => unsub();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const id = await createPatient({ ...form, dob: form.dob || null, allergies: [] });
      toast.success("Patient added.");
      setModalOpen(false);
      setForm({ name: "", phone: "", dob: "", address: "" });
      router.push(`/dashboard/patients/${id}`);
    } catch {
      toast.error("Could not add patient.");
    } finally {
      setSaving(false);
    }
  }

  if (!patients) return <FullPageSpinner />;

  const filtered = patients.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search)
  );

  const columns: Column<Patient>[] = [
    { key: "name", header: "Name", render: (p) => p.name },
    { key: "phone", header: "Phone", render: (p) => p.phone },
    { key: "last", header: "Registered", render: (p) => formatDate(p.createdAt) },
    { key: "allergies", header: "Allergies", render: (p) => p.allergies.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {p.allergies.slice(0, 3).map((a) => (
            <span key={a} className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-error">{a}</span>
          ))}
        </div>
      ) : <span className="text-text-secondary">None</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Patients</h1>
        <Button onClick={() => setModalOpen(true)}>+ Add Patient</Button>
      </div>
      <Input placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="md:w-72" />
      <DataTable columns={columns} rows={filtered} rowKey={(p) => p.id} onRowClick={(p) => router.push(`/dashboard/patients/${p.id}`)} emptyState="No patients yet." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Patient">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Date of Birth" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Patient</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
