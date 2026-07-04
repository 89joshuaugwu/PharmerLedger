"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PatientSearchBar } from "@/components/molecules/PatientSearchBar";
import { AllergyWarningBanner } from "@/components/molecules/AllergyWarningBanner";
import { checkAllergyConflict } from "@/lib/allergy";
import { createPrescription } from "@/lib/prescriptions";
import { mapDrugDoc } from "@/lib/drugs";
import type { Patient } from "@/types/patient";
import type { Drug } from "@/types/drug";
import type { PrescriptionItem } from "@/types/prescription";

export default function NewPrescriptionPage() {
  const router = useRouter();
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctorName, setDoctorName] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [pendingItem, setPendingItem] = useState({ drugId: "", dosage: "", quantity: 1 });
  const [conflict, setConflict] = useState<{ drug: Drug } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDocs(collection(db, "drugs")).then((snap) => setDrugs(snap.docs.map((d) => mapDrugDoc(d.id, d.data()))));
  }, []);

  function attemptAddItem() {
    const drug = drugs.find((d) => d.id === pendingItem.drugId);
    if (!drug || !pendingItem.dosage || pendingItem.quantity < 1) {
      toast.error("Fill in drug, dosage, and quantity.");
      return;
    }
    if (patient && checkAllergyConflict(patient.allergies, drug)) {
      setConflict({ drug });
      return;
    }
    finalizeAddItem(drug);
  }

  function finalizeAddItem(drug: Drug) {
    setItems((prev) => [...prev, { drugId: drug.id, drugName: drug.name, dosage: pendingItem.dosage, quantity: pendingItem.quantity }]);
    setPendingItem({ drugId: "", dosage: "", quantity: 1 });
    setConflict(null);
  }

  async function handleSubmit() {
    if (!patient) return toast.error("Select a patient.");
    if (!doctorName) return toast.error("Enter doctor name.");
    if (items.length === 0) return toast.error("Add at least one item.");

    setSaving(true);
    try {
      const id = await createPrescription({ patientId: patient.id, patientName: patient.name, doctorName, items });
      toast.success("Prescription created.");
      router.push(`/dashboard/prescriptions/${id}`);
    } catch {
      toast.error("Could not create prescription.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-xl font-bold text-text-primary">New Prescription</h1>

      <Card className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-text-primary">Patient</p>
        <PatientSearchBar onSelect={setPatient} />
        {patient && (
          <div className="rounded-lg bg-bg px-3 py-2 text-sm">
            <p className="font-medium text-text-primary">{patient.name} · {patient.phone}</p>
            {patient.allergies.length > 0 && (
              <p className="mt-1 text-xs text-error">Allergies: {patient.allergies.join(", ")}</p>
            )}
          </div>
        )}
        <Input label="Doctor Name" required value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
      </Card>

      <Card className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-text-primary">Items</p>

        {items.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span>{it.drugName} · {it.dosage} · qty {it.quantity}</span>
                <button className="text-xs text-error" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>Remove</button>
              </li>
            ))}
          </ul>
        )}

        {conflict && (
          <AllergyWarningBanner
            patientAllergies={patient?.allergies ?? []}
            drugName={conflict.drug.name}
            onAcknowledge={() => finalizeAddItem(conflict.drug)}
          />
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select
            label="Drug"
            options={[{ value: "", label: "Select drug…" }, ...drugs.map((d) => ({ value: d.id, label: d.name }))]}
            value={pendingItem.drugId}
            onChange={(e) => setPendingItem({ ...pendingItem, drugId: e.target.value })}
          />
          <Input label="Dosage" placeholder="e.g. 500mg twice daily" value={pendingItem.dosage} onChange={(e) => setPendingItem({ ...pendingItem, dosage: e.target.value })} />
          <Input label="Quantity" type="number" min={1} value={pendingItem.quantity} onChange={(e) => setPendingItem({ ...pendingItem, quantity: Number(e.target.value) })} />
        </div>
        <Button type="button" variant="secondary" onClick={attemptAddItem} className="w-fit">+ Add item</Button>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={handleSubmit} loading={saving}>Create Prescription</Button>
      </div>
    </div>
  );
}
