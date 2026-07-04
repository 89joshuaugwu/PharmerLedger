"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatNaira, formatDateTime } from "@/lib/utils";
import { getStockStatus, getExpiryStatus } from "@/types/drug";
import { mapDrugDoc } from "@/lib/drugs";
import { useAuth } from "@/lib/AuthContext";

interface Stats {
  outOfStock: number;
  lowStock: number;
  expiringSoon: number;
  salesTotalToday: number;
  transactionsToday: number;
  prescriptionsFulfilledToday: number;
  recentSales: { id: string; total: number; createdAt: number; type: string }[];
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const drugsSnap = await getDocs(collection(db, "drugs"));
      let outOfStock = 0, lowStock = 0, expiringSoon = 0;

      drugsSnap.docs.forEach((d) => {
        const drug = mapDrugDoc(d.id, d.data());
        const stockStatus = getStockStatus(drug.totalStock, drug.reorderThreshold);
        if (stockStatus === "out_of_stock") outOfStock++;
        else if (stockStatus === "low_stock") lowStock++;
        if (getExpiryStatus(drug.nearestExpiry) === "expiring_soon") expiringSoon++;
      });

      const todayStart = Timestamp.fromDate(startOfToday());

      const salesSnap = await getDocs(
        query(collection(db, "sales"), where("createdAt", ">=", todayStart))
      );
      let salesTotalToday = 0;
      salesSnap.docs.forEach((d) => (salesTotalToday += d.data().total ?? 0));

      const prescriptionsSnap = await getDocs(
        query(
          collection(db, "prescriptions"),
          where("status", "==", "fulfilled"),
          where("fulfilledAt", ">=", todayStart)
        )
      );

      const recentSnap = await getDocs(
        query(collection(db, "sales"), orderBy("createdAt", "desc"), limit(5))
      );

      setStats({
        outOfStock,
        lowStock,
        expiringSoon,
        salesTotalToday,
        transactionsToday: salesSnap.size,
        prescriptionsFulfilledToday: prescriptionsSnap.size,
        recentSales: recentSnap.docs.map((d) => ({
          id: d.id,
          total: d.data().total,
          createdAt: d.data().createdAt?.toMillis?.() ?? 0,
          type: d.data().type,
        })),
      });
    }
    load();
  }, []);

  if (!stats) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Welcome back{user ? `, ${user.displayName}` : ""}</h1>
        <p className="text-sm text-text-secondary">Here&apos;s what&apos;s happening at the counter today.</p>
      </div>

      {/* Alert summary row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Link href="/dashboard/inventory?filter=out_of_stock">
          <Card className="flex items-center justify-between hover:border-error">
            <div>
              <p className="text-sm text-text-secondary">Out of stock</p>
              <p className="text-2xl font-bold text-error">{stats.outOfStock}</p>
            </div>
            <span className="text-2xl">🔴</span>
          </Card>
        </Link>
        <Link href="/dashboard/inventory?filter=low_stock">
          <Card className="flex items-center justify-between hover:border-warning">
            <div>
              <p className="text-sm text-text-secondary">Low stock</p>
              <p className="text-2xl font-bold text-warning">{stats.lowStock}</p>
            </div>
            <span className="text-2xl">🟡</span>
          </Card>
        </Link>
        <Link href="/dashboard/inventory?filter=expiring_soon">
          <Card className="flex items-center justify-between hover:border-warning">
            <div>
              <p className="text-sm text-text-secondary">Expiring within 30 days</p>
              <p className="text-2xl font-bold text-warning">{stats.expiringSoon}</p>
            </div>
            <span className="text-2xl">🟡</span>
          </Card>
        </Link>
      </div>

      {/* Today's stats */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-text-primary">Today&apos;s stats</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold tabular-nums text-text-primary">{formatNaira(stats.salesTotalToday)}</p>
            <p className="text-xs text-text-secondary">Sales today</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums text-text-primary">{stats.transactionsToday}</p>
            <p className="text-xs text-text-secondary">Transactions</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums text-text-primary">{stats.prescriptionsFulfilledToday}</p>
            <p className="text-xs text-text-secondary">Prescriptions fulfilled</p>
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/pos"><Button>New Sale</Button></Link>
        <Link href="/dashboard/prescriptions/new"><Button variant="secondary">New Prescription</Button></Link>
        {user?.role === "admin" && (
          <Link href="/dashboard/inventory/new"><Button variant="secondary">Add Drug</Button></Link>
        )}
      </div>

      {/* Recent activity */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-text-primary">Recent activity</p>
        {stats.recentSales.length === 0 && <p className="text-sm text-text-secondary">No sales yet.</p>}
        <ul className="flex flex-col gap-2">
          {stats.recentSales.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-text-primary">
                Sale #{s.id.slice(0, 6).toUpperCase()} — {formatNaira(s.total)}{" "}
                <span className="text-text-secondary">({s.type})</span>
              </span>
              <span className="text-xs text-text-secondary">{formatDateTime(s.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
