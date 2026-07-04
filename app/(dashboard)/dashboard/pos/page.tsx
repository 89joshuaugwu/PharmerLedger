import { POSCheckout } from "@/components/organisms/POSCheckout";

export default function POSPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text-primary">Point of Sale</h1>
      <POSCheckout />
    </div>
  );
}
