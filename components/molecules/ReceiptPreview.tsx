"use client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatNaira, formatDateTime } from "@/lib/utils";
import { generateReceiptPDF } from "@/lib/receipt";
import type { Sale } from "@/types/sale";

interface ReceiptPreviewProps {
  sale: Sale | null;
  onClose: () => void;
}

export function ReceiptPreview({ sale, onClose }: ReceiptPreviewProps) {
  if (!sale) return null;

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    const pdf = generateReceiptPDF(sale!);
    pdf.save(`receipt-${sale!.id.slice(0, 8)}.pdf`);
  }

  return (
    <Modal open={!!sale} onClose={onClose} title="Sale Complete"
      footer={
        <div className="flex gap-2 no-print">
          <Button variant="secondary" onClick={handlePrint}>Print</Button>
          <Button onClick={handleDownload}>Download PDF</Button>
        </div>
      }
    >
      <div id="receipt-print-area" className="font-mono text-sm">
        <p className="text-center font-bold">PharmaLedger</p>
        <p className="text-center text-xs text-text-secondary">{formatDateTime(sale.createdAt)}</p>
        <p className="text-center text-xs text-text-secondary">Receipt · {sale.id.slice(0, 8).toUpperCase()}</p>
        <hr className="my-2 border-border" />
        {sale.items.map((it, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span>{it.drugName} x{it.quantity}</span>
            <span className="tabular-nums">{formatNaira(it.unitPrice * it.quantity)}</span>
          </div>
        ))}
        <hr className="my-2 border-border" />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatNaira(sale.total)}</span>
        </div>
        <p className="mt-2 text-xs text-text-secondary">Payment: {sale.paymentMethod.toUpperCase()}</p>
        {sale.patientName && <p className="text-xs text-text-secondary">Patient: {sale.patientName}</p>}
        <p className="text-xs text-text-secondary">Served by: {sale.soldByName}</p>
      </div>
    </Modal>
  );
}
