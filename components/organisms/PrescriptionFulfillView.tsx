"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { authedFetch } from "@/lib/api-client";
import type { Prescription } from "@/types/prescription";
import type { Patient } from "@/types/patient";

interface StockCheck {
  drugId: string;
  available: number;
}

interface PrescriptionFulfillViewProps {
  prescription: Prescription;
  patient: Patient | null;
  stockChecks: StockCheck[];
  onFulfilled: () => void;
}

/**
 * Fulfill triggers /api/prescriptions/[id]/fulfill — server-side
 * deductStockFEFO() per item (lib/fefo.ts). On shortfall this route marks
 * the prescription "partially_fulfilled" rather than hard-blocking, unlike
 * POS/OTC sales — see CONTEXT.md Section 3's partial-fulfillment note.
 */
export function PrescriptionFulfillView({ prescription, patient, stockChecks, onFulfilled }: PrescriptionFulfillViewProps) {
  const [fulfilling, setFulfilling] = useState(false);
  const alreadyDone = prescription.status === "fulfilled";

  async function handleFulfill() {
    setFulfilling(true);
    try {
      const res = await authedFetch(`/api/prescriptions/${prescription.id}/fulfill`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fulfillment failed.");

      if (data.status === "partially_fulfilled") {
        toast("Some items had insufficient stock — marked as partially fulfilled.", { icon: "⚠️" });
      } else {
        toast.success("Prescription fulfilled.");
      }
      onFulfilled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not fulfill prescription.");
    } finally {
      setFulfilling(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-text-primary">{prescription.patientName}</h1>
            <p className="text-sm text-text-secondary">Dr. {prescription.doctorName} · {formatDate(prescription.createdAt)}</p>
          </div>
          <StatusBadge status={prescription.status} />
        </div>
        {patient && patient.allergies.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {patient.allergies.map((a) => (
              <span key={a} className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-error">{a}</span>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-text-primary">Items</p>
        <ul className="flex flex-col divide-y divide-border">
          {prescription.items.map((it, i) => {
            const stock = stockChecks.find((s) => s.drugId === it.drugId);
            const insufficient = stock ? stock.available < it.quantity : false;
            return (
              <li key={i} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="text-text-primary">{it.drugName} · {it.dosage}</p>
                  <p className="text-xs text-text-secondary">
                    Requested: {it.quantity}
                    {it.quantityFulfilled !== undefined && ` · Fulfilled: ${it.quantityFulfilled}`}
                  </p>
                </div>
                {insufficient ? (
                  <span className="text-xs font-medium text-error">Only {stock?.available} available</span>
                ) : (
                  <span className="text-xs font-medium text-success">Stock OK</span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {prescription.fulfilledAt && (
        <p className="text-xs text-text-secondary">Fulfilled {formatDateTime(prescription.fulfilledAt)}</p>
      )}

      {!alreadyDone && (
        <Button onClick={handleFulfill} loading={fulfilling} className="w-fit">
          Fulfill Prescription
        </Button>
      )}
    </div>
  );
}
