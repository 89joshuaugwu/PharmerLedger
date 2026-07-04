"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PrescriptionFulfillView } from "@/components/organisms/PrescriptionFulfillView";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { mapPrescriptionDoc } from "@/lib/prescriptions";
import { mapPatientDoc } from "@/lib/patients";
import { mapDrugDoc } from "@/lib/drugs";
import type { Prescription } from "@/types/prescription";
import type { Patient } from "@/types/patient";

export default function PrescriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [stockChecks, setStockChecks] = useState<{ drugId: string; available: number }[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "prescriptions", id), (snap) => {
      if (snap.exists()) setPrescription(mapPrescriptionDoc(snap.id, snap.data()));
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!prescription) return;
    getDoc(doc(db, "patients", prescription.patientId)).then((snap) => {
      if (snap.exists()) setPatient(mapPatientDoc(snap.id, snap.data()));
    });
    Promise.all(
      prescription.items.map(async (it) => {
        const snap = await getDoc(doc(db, "drugs", it.drugId));
        return { drugId: it.drugId, available: snap.exists() ? mapDrugDoc(snap.id, snap.data()).totalStock : 0 };
      })
    ).then(setStockChecks);
  }, [prescription]);

  const refresh = useCallback(() => {}, []);

  if (!prescription) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => router.back()} className="w-fit text-sm text-text-secondary hover:text-text-primary">
        ← Back to prescriptions
      </button>
      <PrescriptionFulfillView
        prescription={prescription}
        patient={patient}
        stockChecks={stockChecks}
        onFulfilled={refresh}
      />
    </div>
  );
}
