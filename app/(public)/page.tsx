import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center">
      <img src="/logo.svg" alt="PharmaLedger Logo" className="h-20 w-20 mb-2" />
      <h1 className="text-3xl font-bold text-text-primary md:text-4xl">
        Accurate stock. Accurate money. One ledger.
      </h1>
      <p className="max-w-xl text-text-secondary">
        PharmaLedger tracks drug inventory by expiry batch, fulfills prescriptions safely,
        and runs POS sales — all from one system built for the pharmacy counter.
      </p>
      <Link href="/auth/login">
        <Button className="px-6">Staff Login</Button>
      </Link>
    </div>
  );
}
