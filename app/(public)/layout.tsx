import { PublicShell } from "@/components/shells/PublicShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
