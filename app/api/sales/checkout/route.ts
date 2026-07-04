// POST /api/sales/checkout — the ONLY place OTC/POS stock deduction may
// happen. Client sends cart items + patient + payment method; this route
// runs deductStockFEFOMulti() (lib/fefo.ts) with firebase-admin, atomically,
// then writes the /sales doc, checks notification thresholds, and returns
// receipt data. Never move this logic to a client-side updateDoc() call —
// attendants have no direct write access to /drugs/{id}/batches per
// firestore.rules, and doing it client-side loses the transaction guarantee
// against two attendants selling the last units at the same moment.
import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveUser, UnauthorizedError } from "@/lib/api-auth";
import { deductStockFEFOMulti, InsufficientStockError } from "@/lib/fefo";
import { checkAndNotifyStockLevels, getActiveAdminUids } from "@/lib/notifications";

interface CheckoutItem {
  drugId: string;
  drugName: string;
  sellingPrice: number;
  quantity: number;
}

interface CheckoutBody {
  items: CheckoutItem[];
  patientId: string | null;
  patientName: string | null;
  paymentMethod: "cash" | "card" | "transfer";
}

export async function POST(request: NextRequest) {
  try {
    const caller = await requireActiveUser(request);
    const body: CheckoutBody = await request.json();

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    // Hard-block behavior for OTC sales: deductStockFEFOMulti runs every
    // line inside ONE transaction — if any line is short, nothing is
    // deducted and nothing is charged (see lib/fefo.ts for the atomicity
    // guarantee). This is intentionally different from prescription
    // fulfillment, which allows partial success per item.
    let deductionResult;
    try {
      deductionResult = await deductStockFEFOMulti(
        body.items.map((i) => ({ drugId: i.drugId, quantity: i.quantity }))
      );
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        return NextResponse.json(
          {
            error: `Insufficient stock for one or more items.`,
            drugId: err.drugId,
            available: err.available,
            requested: err.requested,
          },
          { status: 409 }
        );
      }
      throw err;
    }

    // Build the sale doc, mapping each cart line to the batch(es) FEFO
    // actually drew from (a single cart line can span >1 batch).
    const saleItems = body.items.flatMap((item) => {
      const plan = deductionResult.perDrug.find((p) => p.drugId === item.drugId)!;
      return plan.deductions.map((d) => ({
        drugId: item.drugId,
        drugName: item.drugName,
        batchId: d.batchId,
        batchNumber: d.batchNumber,
        quantity: d.quantityDeducted,
        unitPrice: item.sellingPrice,
        costPrice: 0, // cost price is per-batch; omitted from cart payload, fine for receipt purposes
      }));
    });

    const total = body.items.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0);

    const saleRef = await adminDb.collection("sales").add({
      type: body.patientId ? "prescription" : "otc",
      prescriptionId: null,
      patientId: body.patientId,
      patientName: body.patientName,
      items: saleItems,
      total,
      paymentMethod: body.paymentMethod,
      soldBy: caller.uid,
      soldByName: caller.displayName,
      receiptUrl: null,
      createdAt: Timestamp.now(),
    });

    // Fire low-stock / out-of-stock notifications for any drug that
    // crossed its threshold as a result of this sale.
    const adminUids = await getActiveAdminUids();
    await Promise.all(
      deductionResult.perDrug.map(async (plan) => {
        const drugSnap = await adminDb.collection("drugs").doc(plan.drugId).get();
        const drugData = drugSnap.data();
        if (!drugData) return;
        await checkAndNotifyStockLevels(plan.drugId, drugData.name, plan.newTotalStock, drugData.reorderThreshold, adminUids);
      })
    );

    return NextResponse.json({ saleId: saleRef.id }, { status: 200 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Checkout failed. Try again." }, { status: 500 });
  }
}
