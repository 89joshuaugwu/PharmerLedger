"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Package, Users, FileText,
  BarChart3, UserCog, Settings, LogOut, MoreHorizontal, Receipt,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { logout } from "@/lib/auth";
import { AlertBell } from "@/components/molecules/AlertBell";
import { useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/pos", label: "POS", icon: ShoppingCart },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/patients", label: "Patients", icon: Users },
  { href: "/dashboard/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/dashboard/sales", label: "Sales History", icon: Receipt },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { href: "/dashboard/users", label: "Staff", icon: UserCog, adminOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/pos", label: "POS", icon: ShoppingCart },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/patients", label: "Patients", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleNav = NAV.filter((item) => !item.adminOnly || user?.role === "admin");
  const moreNav = visibleNav.filter((i) => !MOBILE_TABS.some((t) => t.href === i.href));

  async function handleLogout() {
    await logout();
    router.replace("/auth/login");
  }

  return (
    <div className="min-h-screen bg-bg md:flex">
      {/* Desktop sidebar — always visible, 240px fixed */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-white">
        <div className="px-5 py-5">
          <Link href="/dashboard" className="text-lg font-bold text-primary">
            PharmaLedger
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-primary text-white" : "text-text-primary hover:bg-bg"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-3 py-4">
          <div className="px-3 pb-2 text-xs text-text-secondary">
            {user?.displayName} · <span className="capitalize">{user?.role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-error hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white px-4 py-3 md:px-6">
          <span className="text-base font-bold text-primary md:hidden">PharmaLedger</span>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <AlertBell />
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="rounded-lg p-2 hover:bg-bg md:hidden"
            >
              <LogOut className="h-5 w-5 text-error" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:py-6 md:pb-6">{children}</main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-border bg-white md:hidden">
          {MOBILE_TABS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium min-h-12",
                  active ? "text-primary" : "text-text-secondary"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-text-secondary min-h-12"
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>

          {moreOpen && (
            <div className="absolute bottom-14 right-2 w-48 rounded-xl border border-border bg-white p-2 shadow-lg">
              {moreNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-primary hover:bg-bg"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
