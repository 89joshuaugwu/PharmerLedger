"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CartItem } from "@/components/molecules/CartItem";
import { PatientSearchBar } from "@/components/molecules/PatientSearchBar";
import { AllergyWarningBanner } from "@/components/molecules/AllergyWarningBanner";
import { ReceiptPreview } from "@/components/molecules/ReceiptPreview";
import { checkAllergyConflict } from "@/lib/allergy";
import { authedFetch } from "@/lib/api-client";
import { mapDrugDoc } from "@/lib/drugs";
import { formatNaira } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import type { Drug } from "@/types/drug";
import type { Patient } from "@/types/patient";
import type { CartLine, Sale, PaymentMethod } from "@/types/sale";

export function POSCheckout() {
  const { user } = useAuth();
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [walkIn, setWalkIn] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [conflict, setConflict] = useState<Drug | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  useEffect(() => {
    getDocs(collection(db, "drugs")).then((snap) => setDrugs(snap.docs.map((d) => mapDrugDoc(d.id, d.data()))));
  }, []);

  const searchResults = search.length > 0
    ? drugs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  function addToCart(drug: Drug) {
    if (!walkIn && patient && checkAllergyConflict(patient.allergies, drug)) {
      setConflict(drug);
      return;
    }
    finalizeAdd(drug);
  }

  function finalizeAdd(drug: Drug) {
    setCart((prev) => {
      const existing = prev.find((l) => l.drugId === drug.id);
      if (existing) {
        return prev.map((l) => (l.drugId === drug.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { drugId: drug.id, drugName: drug.name, sellingPrice: drug.sellingPrice, quantity: 1, availableStock: drug.totalStock }];
    });
    setSearch("");
    setConflict(null);
  }

  function updateQuantity(drugId: string, quantity: number) {
    setCart((prev) => prev.map((l) => (l.drugId === drugId ? { ...l, quantity } : l)));
  }

  function removeLine(drugId: string) {
    setCart((prev) => prev.filter((l) => l.drugId !== drugId));
  }

  const total = cart.reduce((sum, l) => sum + l.sellingPrice * l.quantity, 0);
  const hasOverStock = cart.some((l) => l.quantity > l.availableStock);

  async function handleCheckout() {
    if (cart.length === 0) return toast.error("Cart is empty.");
    setCheckingOut(true);
    try {
      const res = await authedFetch("/api/sales/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((l) => ({ drugId: l.drugId, drugName: l.drugName, sellingPrice: l.sellingPrice, quantity: l.quantity })),
          patientId: walkIn ? null : patient?.id ?? null,
          patientName: walkIn ? null : patient?.name ?? null,
          paymentMethod,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(`Only ${data.available} units available for one of your items. Adjust the cart.`);
        } else {
          toast.error(data.error ?? "Checkout failed.");
        }
        return;
      }

      toast.success("Sale completed.");
      setCompletedSale({
        id: data.saleId,
        type: walkIn ? "otc" : "prescription",
        prescriptionId: null,
        patientId: walkIn ? null : patient?.id ?? null,
        patientName: walkIn ? null : patient?.name ?? null,
        items: cart.map((l) => ({ drugId: l.drugId, drugName: l.drugName, batchId: "", batchNumber: "", quantity: l.quantity, unitPrice: l.sellingPrice, costPrice: 0 })),
        total,
        paymentMethod,
        soldBy: user?.uid ?? "",
        soldByName: user?.displayName ?? "",
        receiptUrl: null,
        createdAt: Date.now(),
      });
      setCart([]);
      setPatient(null);
    } catch {
      toast.error("Checkout failed. Check your connection.");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      {/* Left: search + patient */}
      <div className="md:col-span-3 flex flex-col gap-4">
        <Card>
          <p className="mb-2 text-sm font-semibold text-text-primary">Add drugs</p>
          <div className="relative">
            <Input placeholder="Search drug name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {searchResults.length > 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-white shadow-lg">
                {searchResults.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => addToCart(d)}
                    disabled={d.totalStock === 0}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-bg disabled:opacity-40"
                  >
                    <span>{d.name}</span>
                    <span className="text-xs tabular-nums text-text-secondary">{formatNaira(d.sellingPrice)} · {d.totalStock} left</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-sm font-semibold text-text-primary">Patient</p>
          <div className="mb-3 flex gap-2">
            <button onClick={() => { setWalkIn(true); setPatient(null); }} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${walkIn ? "border-primary bg-primary text-white" : "border-border text-text-secondary"}`}>
              Walk-in / OTC
            </button>
            <button onClick={() => setWalkIn(false)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${!walkIn ? "border-primary bg-primary text-white" : "border-border text-text-secondary"}`}>
              Registered Patient
            </button>
          </div>
          {!walkIn && <PatientSearchBar onSelect={setPatient} />}
          {!walkIn && patient?.allergies && patient.allergies.length > 0 && (
            <p className="mt-2 text-xs text-error">Allergies on file: {patient.allergies.join(", ")}</p>
          )}
        </Card>

        {conflict && (
          <AllergyWarningBanner
            patientAllergies={patient?.allergies ?? []}
            drugName={conflict.name}
            onAcknowledge={() => finalizeAdd(conflict)}
          />
        )}
      </div>

      {/* Right: cart summary */}
      <div className="md:col-span-2">
        <Card className="sticky top-20">
          <p className="mb-2 text-sm font-semibold text-text-primary">Cart</p>
          {cart.length === 0 && <p className="py-6 text-center text-sm text-text-secondary">No items yet.</p>}
          <div>
            {cart.map((line) => (
              <CartItem key={line.drugId} line={line} onQuantityChange={updateQuantity} onRemove={removeLine} />
            ))}
          </div>
          {cart.length > 0 && (
            <>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatNaira(total)}</span>
              </div>
              <div className="mt-3">
                <Select
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  options={[{ value: "cash", label: "Cash" }, { value: "card", label: "Card" }, { value: "transfer", label: "Transfer" }]}
                />
              </div>
              {hasOverStock && (
                <p className="mt-2 text-xs font-medium text-error">
                  One or more items exceed available stock — checkout will be blocked until adjusted.
                </p>
              )}
              <Button onClick={handleCheckout} loading={checkingOut} disabled={hasOverStock} className="mt-4 w-full">
                Complete Sale
              </Button>
            </>
          )}
        </Card>
      </div>

      <ReceiptPreview sale={completedSale} onClose={() => setCompletedSale(null)} />
    </div>
  );
}
