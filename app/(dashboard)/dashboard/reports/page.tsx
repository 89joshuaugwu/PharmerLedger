"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ReportsDashboard } from "@/components/organisms/ReportsDashboard";
import { useAuth } from "@/lib/AuthContext";

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      toast.error("Reports are admin-only.");
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (user?.role !== "admin") return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text-primary">Reports</h1>
      <ReportsDashboard />
    </div>
  );
}
