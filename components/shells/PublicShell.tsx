import Link from "next/link";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary">
            <img src="/logo.svg" alt="PharmaLedger Logo" className="h-8 w-8" />
            <span>PharmaLedger</span>
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-white py-6 text-center text-xs text-text-secondary">
        PharmaLedger — accurate, auditable stock and money tracking.
      </footer>
    </div>
  );
}
