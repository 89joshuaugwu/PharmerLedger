"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PatientProfile } from "@/components/organisms/PatientProfile";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { mapPatientDoc } from "@/lib/patients";
import type { Patient } from "@/types/patient";

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "patients", id), (snap) => {
      if (snap.exists()) setPatient(mapPatientDoc(snap.id, snap.data()));
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    async function loadHistory() {
      const [presSnap, salesSnap] = await Promise.all([
        getDocs(query(collection(db, "prescriptions"), where("patientId", "==", id))),
        getDocs(query(collection(db, "sales"), where("patientId", "==", id))),
      ]);

      const presEntries = presSnap.docs.map((d) => ({
        id: d.id, kind: "prescription" as const,
        label: `Prescription — ${d.data().doctorName} (${d.data().status})`,
        amount: null, status: d.data().status,
        date: d.data().createdAt?.toMillis?.() ?? 0,
      }));
      const saleEntries = salesSnap.docs.map((d) => ({
        id: d.id, kind: "sale" as const,
        label: `Purchase — ${d.data().items?.length ?? 0} item(s)`,
        amount: d.data().total, status: null,
        date: d.data().createdAt?.toMillis?.() ?? 0,
      }));

      setHistory([...presEntries, ...saleEntries].sort((a, b) => b.date - a.date));
    }
    loadHistory();
  }, [id]);

  if (!patient) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => router.back()} className="w-fit text-sm text-text-secondary hover:text-text-primary">
        ← Back to patients
      </button>
      <PatientProfile patient={patient} history={history} />
    </div>
  );
}
