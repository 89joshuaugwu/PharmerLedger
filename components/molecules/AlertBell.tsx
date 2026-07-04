"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NotifItem {
  id: string;
  type: string;
  drugId: string | null;
  message: string;
  read: boolean;
  createdAt: number;
}

export function AlertBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications", user.uid, "items"),
      where("read", "==", false),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          type: d.data().type,
          drugId: d.data().drugId ?? null,
          message: d.data().message,
          read: d.data().read,
          createdAt: d.data().createdAt?.toMillis?.() ?? Date.now(),
        }))
      );
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markRead(id: string) {
    if (!user) return;
    await updateDoc(doc(db, "notifications", user.uid, "items", id), { read: true });
  }

  const icon = (type: string) => (type === "out_of_stock" || type === "allergy_flagged" ? "🔴" : "🟡");

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative rounded-lg p-2 hover:bg-bg"
      >
        <Bell className="h-5 w-5 text-text-primary" />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-border bg-white shadow-lg">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-text-secondary">You&apos;re all caught up.</div>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.drugId ? `/dashboard/inventory/${n.drugId}` : "/dashboard/inventory"}
                onClick={() => markRead(n.id)}
                className={cn("flex gap-2 border-b border-border px-4 py-3 text-sm hover:bg-bg last:border-0")}
              >
                <span>{icon(n.type)}</span>
                <div className="flex-1">
                  <p className="text-text-primary">{n.message}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{formatDateTime(n.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
