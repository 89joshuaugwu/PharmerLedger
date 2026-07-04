"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AllergyWarningBannerProps {
  patientAllergies: string[];
  drugName: string;
  onAcknowledge: () => void;
}

/**
 * Red, requires an explicit "Acknowledge and proceed" click — not just a
 * dismiss X — before the flagged item can be added. Per DESIGN.md &
 * accessibility spec, the acknowledgment must be keyboard-reachable.
 */
export function AllergyWarningBanner({ patientAllergies, drugName, onAcknowledge }: AllergyWarningBannerProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (acknowledged) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-error bg-red-50 p-4">
      <div className="flex gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0 text-error" />
        <div>
          <p className="text-sm font-semibold text-error">Possible allergy conflict</p>
          <p className="mt-1 text-sm text-text-primary">
            This patient has a recorded allergy ({patientAllergies.join(", ")}) that matches{" "}
            <strong>{drugName}</strong>. This is a simplified name/category match, not a clinical
            interaction check — confirm with the patient before proceeding.
          </p>
        </div>
      </div>
      <Button
        variant="danger"
        className="w-fit"
        onClick={() => { setAcknowledged(true); onAcknowledge(); }}
      >
        Acknowledge and proceed
      </Button>
    </div>
  );
}
