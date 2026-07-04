"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/Input";
import type { Patient } from "@/types/patient";

interface PatientSearchBarProps {
  onSelect: (patient: Patient) => void;
  placeholder?: string;
}

function mapPatient(id: string, data: any): Patient {
  return {
    id, name: data.name, phone: data.phone, dob: data.dob ?? null,
    address: data.address ?? "", allergies: data.allergies ?? [],
    createdAt: data.createdAt?.toMillis?.() ?? 0,
  };
}

/** Typeahead by name/phone. Allergy chips shown inline in results. */
export function PatientSearchBar({ onSelect, placeholder = "Search patient by name or phone…" }: PatientSearchBarProps) {
  const [term, setTerm] = useState("");
  const [all, setAll] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getDocs(collection(db, "patients")).then((snap) => {
      setAll(snap.docs.map((d) => mapPatient(d.id, d.data())));
    });
  }, []);

  const results = term.length > 0
    ? all.filter((p) => p.name.toLowerCase().includes(term.toLowerCase()) || p.phone.includes(term)).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={term}
        onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-white shadow-lg">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onSelect(p); setTerm(p.name); setOpen(false); }}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-bg"
            >
              <span>
                <span className="font-medium text-text-primary">{p.name}</span>{" "}
                <span className="text-text-secondary">· {p.phone}</span>
              </span>
              {p.allergies.length > 0 && (
                <span className="flex gap-1">
                  {p.allergies.slice(0, 2).map((a) => (
                    <span key={a} className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-error">{a}</span>
                  ))}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
