"use client";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { formatNaira, formatDate } from "@/lib/utils";
import { mapSaleDoc } from "@/lib/sales";
import { mapDrugDoc } from "@/lib/drugs";
import type { Sale } from "@/types/sale";
import type { Drug } from "@/types/drug";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ReportsDashboard() {
  const [from, setFrom] = useState(toDateInput(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(toDateInput(new Date()));
  const [sales, setSales] = useState<Sale[]>([]);
  const [wasteBatches, setWasteBatches] = useState<{ drugName: string; batchNumber: string; quantity: number; costPrice: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const fromTs = Timestamp.fromDate(new Date(from));
      const toTs = Timestamp.fromDate(new Date(new Date(to).getTime() + 86400000));

      const salesSnap = await getDocs(
        query(collection(db, "sales"), where("createdAt", ">=", fromTs), where("createdAt", "<", toTs))
      );
      setSales(salesSnap.docs.map((d) => mapSaleDoc(d.id, d.data())));

      const drugsSnap = await getDocs(collection(db, "drugs"));
      const waste: typeof wasteBatches = [];
      await Promise.all(
        drugsSnap.docs.map(async (drugDoc) => {
          const drug = mapDrugDoc(drugDoc.id, drugDoc.data());
          const batchesSnap = await getDocs(
            query(collection(db, "drugs", drugDoc.id, "batches"), where("quantity", ">", 0))
          );
          batchesSnap.docs.forEach((b) => {
            const expiry = b.data().expiryDate?.toMillis?.() ?? 0;
            if (expiry < Date.now()) {
              waste.push({ drugName: drug.name, batchNumber: b.data().batchNumber, quantity: b.data().quantity, costPrice: b.data().costPrice });
            }
          });
        })
      );
      setWasteBatches(waste);
      setLoading(false);
    }
    load();
  }, [from, to]);

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const transactionCount = sales.length;

  const drugVolume = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => s.items.forEach((it: any) => map.set(it.drugName, (map.get(it.drugName) ?? 0) + it.quantity)));
    return Array.from(map.entries()).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [sales]);

  const topDrug = drugVolume[0]?.name ?? "—";

  const trend = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => {
      const day = formatDate(s.createdAt);
      map.set(day, (map.get(day) ?? 0) + s.total);
    });
    return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
  }, [sales]);

  const wasteCost = wasteBatches.reduce((sum, w) => sum + w.quantity * w.costPrice, 0);

  function exportCSV() {
    const csv = Papa.unparse(sales.map((s) => ({
      id: s.id, type: s.type, patient: s.patientName ?? "Walk-in",
      total: s.total, paymentMethod: s.paymentMethod, date: formatDate(s.createdAt),
    })));
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pharmaledger-sales-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`PharmaLedger Report: ${from} to ${to}`, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [["Sale ID", "Type", "Patient", "Total", "Payment", "Date"]],
      body: sales.map((s) => [s.id.slice(0, 8), s.type, s.patientName ?? "Walk-in", formatNaira(s.total), s.paymentMethod, formatDate(s.createdAt)]),
      styles: { fontSize: 8 },
    });
    doc.save(`pharmaledger-report-${from}-to-${to}.pdf`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <DatePicker label="From" value={from} onChange={setFrom} />
        <DatePicker label="To" value={to} onChange={setTo} min={from} />
        <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
        <Button variant="secondary" onClick={exportPDF}>Export PDF</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card><p className="text-sm text-text-secondary">Total Revenue</p><p className="text-2xl font-bold tabular-nums text-primary">{formatNaira(totalRevenue)}</p></Card>
        <Card><p className="text-sm text-text-secondary">Transactions</p><p className="text-2xl font-bold tabular-nums">{transactionCount}</p></Card>
        <Card><p className="text-sm text-text-secondary">Top-Selling Drug</p><p className="text-2xl font-bold">{topDrug}</p></Card>
      </div>

      <Card>
        <p className="mb-3 text-sm font-semibold text-text-primary">Sales Trend</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatNaira(v)} />
            <Line type="monotone" dataKey="total" stroke="#0D7377" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-text-primary">Top 10 Drugs by Volume</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={drugVolume}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="qty" fill="#0D7377" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <p className="mb-1 text-sm font-semibold text-text-primary">Expiry / Waste Report</p>
        <p className="mb-3 text-xs text-text-secondary">Batches expired unsold — cost impact at cost price.</p>
        {wasteBatches.length === 0 ? (
          <p className="text-sm text-text-secondary">No expired unsold stock. 🎉</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-text-secondary"><th className="py-1">Drug</th><th>Batch</th><th>Qty</th><th>Cost Impact</th></tr></thead>
              <tbody>
                {wasteBatches.map((w, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1.5">{w.drugName}</td>
                    <td className="font-mono text-xs">{w.batchNumber}</td>
                    <td className="tabular-nums">{w.quantity}</td>
                    <td className="tabular-nums">{formatNaira(w.quantity * w.costPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-right text-sm font-bold">Total waste cost: {formatNaira(wasteCost)}</p>
          </>
        )}
      </Card>
    </div>
  );
}
