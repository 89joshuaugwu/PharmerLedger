"use client";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { X, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatDate, formatNaira } from "@/lib/utils";
import { updatePatientAllergies } from "@/lib/patients";
import type { Patient } from "@/types/patient";

interface HistoryEntry {
  id: string;
  kind: "prescription" | "sale";
  label: string;
  amount: number | null;
  status: string | null;
  date: number;
}

interface PatientProfileProps {
  patient: Patient;
  history: HistoryEntry[];
}

export function PatientProfile({ patient, history }: PatientProfileProps) {
  const [allergies, setAllergies] = useState(patient.allergies);
  const [newAllergy, setNewAllergy] = useState("");
  const [saving, setSaving] = useState(false);

  async function persist(next: string[]) {
    setSaving(true);
    try {
      await updatePatientAllergies(patient.id, next);
      setAllergies(next);
    } catch {
      toast.error("Could not update allergies.");
    } finally {
      setSaving(false);
    }
  }

  function addAllergy() {
    const trimmed = newAllergy.trim();
    if (!trimmed || allergies.includes(trimmed)) return;
    persist([...allergies, trimmed]);
    setNewAllergy("");
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h1 className="text-xl font-bold text-text-primary">{patient.name}</h1>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <div><p className="text-text-secondary">Phone</p><p>{patient.phone}</p></div>
          <div><p className="text-text-secondary">DOB</p><p>{patient.dob ?? "—"}</p></div>
          <div><p className="text-text-secondary">Address</p><p>{patient.address || "—"}</p></div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-text-primary">Allergies</p>
        <div className="flex flex-wrap gap-2">
          {allergies.map((a) => (
            <span key={a} className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-error">
              {a}
              <button disabled={saving} onClick={() => persist(allergies.filter((x) => x !== a))} aria-label={`Remove ${a}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {allergies.length === 0 && <span className="text-sm text-text-secondary">No known allergies recorded.</span>}
        </div>
        <div className="mt-3 flex gap-2">
          <Input value={newAllergy} onChange={(e) => setNewAllergy(e.target.value)} placeholder="e.g. Penicillin" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())} />
          <Button type="button" variant="secondary" onClick={addAllergy} disabled={saving}><Plus className="h-4 w-4" /> Add</Button>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-text-primary">History</p>
        {history.length === 0 && <p className="text-sm text-text-secondary">No prescriptions or purchases yet.</p>}
        <ul className="flex flex-col divide-y divide-border">
          {history.map((h) => (
            <li key={`${h.kind}-${h.id}`} className="flex items-center justify-between py-3 text-sm">
              <Link
                href={h.kind === "prescription" ? `/dashboard/prescriptions/${h.id}` : "/dashboard/sales"}
                className="text-text-primary hover:text-primary"
              >
                {h.label}
              </Link>
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                {h.amount !== null && <span className="tabular-nums">{formatNaira(h.amount)}</span>}
                <span>{formatDate(h.date)}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
