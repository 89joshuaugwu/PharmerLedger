import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-4 md:p-5", className)}>
      {children}
    </div>
  );
}
