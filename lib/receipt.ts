// Client-side receipt generation. jsPDF for instant print/download,
// Cloudinary upload in the background for a persistent shareable
// receiptUrl stored on sales/{saleId}.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Sale } from "@/types/sale";
import { formatNaira, formatDateTime } from "./utils";

export function generateReceiptPDF(sale: Sale): jsPDF {
  const docu = new jsPDF({ unit: "mm", format: [80, 150 + sale.items.length * 8] });
  let y = 10;

  docu.setFontSize(14);
  docu.setFont("helvetica", "bold");
  docu.text("PharmaLedger", 40, y, { align: "center" });
  y += 6;

  docu.setFontSize(8);
  docu.setFont("helvetica", "normal");
  docu.text(formatDateTime(sale.createdAt), 40, y, { align: "center" });
  y += 4;
  docu.text(`Receipt · ${sale.id.slice(0, 8).toUpperCase()}`, 40, y, { align: "center" });
  y += 4;
  docu.text(`Served by: ${sale.soldByName}`, 40, y, { align: "center" });
  y += 6;

  autoTable(docu, {
    startY: y,
    margin: { left: 4, right: 4 },
    styles: { fontSize: 7, cellPadding: 1 },
    head: [["Item", "Qty", "Unit", "Total"]],
    body: sale.items.map((i) => [
      i.drugName,
      String(i.quantity),
      formatNaira(i.unitPrice),
      formatNaira(i.unitPrice * i.quantity),
    ]),
    theme: "plain",
    headStyles: { fontStyle: "bold" },
  });

  const finalY = (docu as any).lastAutoTable.finalY + 4;
  docu.setFont("helvetica", "bold");
  docu.setFontSize(10);
  docu.text(`Total: ${formatNaira(sale.total)}`, 4, finalY);
  docu.setFontSize(7);
  docu.setFont("helvetica", "normal");
  docu.text(`Payment: ${sale.paymentMethod.toUpperCase()}`, 4, finalY + 5);
  if (sale.patientName) docu.text(`Patient: ${sale.patientName}`, 4, finalY + 9);

  return docu;
}

/**
 * Uploads the generated PDF blob to Cloudinary (unsigned preset) and
 * returns the secure_url to store as sales/{saleId}.receiptUrl.
 * Falls back silently (returns null) if upload fails — the sale itself
 * is already committed server-side, a missing receiptUrl just means the
 * user relies on the local PDF download/print instead.
 */
export async function uploadReceiptToCloudinary(pdfBlob: Blob, saleId: string): Promise<string | null> {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const formData = new FormData();
    formData.append("file", pdfBlob, `receipt-${saleId}.pdf`);
    formData.append("upload_preset", "pharmaledger_receipts");
    formData.append("public_id", `receipts/${saleId}`);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.secure_url ?? null;
  } catch {
    return null;
  }
}
