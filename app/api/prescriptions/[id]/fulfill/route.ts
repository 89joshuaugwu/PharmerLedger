// POST /api/prescriptions/[id]/fulfill — server-only prescription
// fulfillment. Runs deductStockFEFO() (lib/fefo.ts) PER ITEM, not one
// combined transaction like checkout — because a prescription is allowed
// to legitimately partial-fill (CONTEXT.md Section 3): a customer can come
// back for the rest of a course of antibiotics, unlike an OTC sale which
// hard-blocks on any shortfall.
import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveUser, UnauthorizedError } from "@/lib/api-auth";
import { deductStockFEFO, InsufficientStockError } from "@/lib/fefo";
import { checkAndNotifyStockLevels, getActiveAdminUids } from "@/lib/notifications";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await requireActiveUser(request);
    const { id } = await params;

    const prescRef = adminDb.collection("prescriptions").doc(id);
    const prescSnap = await prescRef.get();
    if (!prescSnap.exists) {
      return NextResponse.json({ error: "Prescription not found." }, { status: 404 });
    }
    const prescription = prescSnap.data()!;
    if (prescription.status === "fulfilled") {
      return NextResponse.json({ error: "Already fulfilled." }, { status: 400 });
    }

    const adminUids = await getActiveAdminUids();
    const saleItems: any[] = [];
    const updatedItems: any[] = [];
    let anyShortfall = false;

    for (const item of prescription.items) {
      const alreadyFulfilled = item.quantityFulfilled ?? 0;
      const stillNeeded = item.quantity - alreadyFulfilled;
      if (stillNeeded <= 0) {
        updatedItems.push(item);
        continue;
      }

      try {
        const result = await deductStockFEFO(item.drugId, stillNeeded);
        result.deductions.forEach((d) =>
          saleItems.push({
            drugId: item.drugId,
            drugName: item.drugName,
            batchId: d.batchId,
            batchNumber: d.batchNumber,
            quantity: d.quantityDeducted,
            unitPrice: 0,
            costPrice: 0,
          })
        );
        updatedItems.push({ ...item, quantityFulfilled: item.quantity });

        const drugSnap = await adminDb.collection("drugs").doc(item.drugId).get();
        const drugData = drugSnap.data();
        if (drugData) {
          await checkAndNotifyStockLevels(item.drugId, drugData.name, result.newTotalStock, drugData.reorderThreshold, adminUids);
        }
      } catch (err) {
        if (err instanceof InsufficientStockError) {
          // Partial fulfillment: take whatever is available, flag the rest.
          anyShortfall = true;
          const available = err.available;
          if (available > 0) {
            const partial = await deductStockFEFO(item.drugId, available);
            partial.deductions.forEach((d) =>
              saleItems.push({
                drugId: item.drugId,
                drugName: item.drugName,
                batchId: d.batchId,
                batchNumber: d.batchNumber,
                quantity: d.quantityDeducted,
                unitPrice: 0,
                costPrice: 0,
              })
            );
          }
          updatedItems.push({ ...item, quantityFulfilled: alreadyFulfilled + available });
        } else {
          throw err;
        }
      }
    }

    const newStatus = anyShortfall ? "partially_fulfilled" : "fulfilled";

    await prescRef.update({
      items: updatedItems,
      status: newStatus,
      fulfilledBy: caller.uid,
      fulfilledAt: Timestamp.now(),
    });

    if (saleItems.length > 0) {
      await adminDb.collection("sales").add({
        type: "prescription",
        prescriptionId: id,
        patientId: prescription.patientId,
        patientName: prescription.patientName,
        items: saleItems,
        total: 0, // prescriptions are dispensed, not sold at counter price in this flow
        paymentMethod: "cash",
        soldBy: caller.uid,
        soldByName: caller.displayName,
        receiptUrl: null,
        createdAt: Timestamp.now(),
      });
    }

    return NextResponse.json({ status: newStatus }, { status: 200 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Fulfillment error:", err);
    return NextResponse.json({ error: "Fulfillment failed. Try again." }, { status: 500 });
  }
}
