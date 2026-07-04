import { AuthProvider } from "@/lib/AuthContext";
import { AppShell } from "@/components/shells/AppShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
