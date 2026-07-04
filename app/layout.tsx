import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "PharmaLedger",
  description: "Pharmacy inventory, prescriptions, and POS — accurate stock and money tracking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2500,
            style: { background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0" },
            success: { iconTheme: { primary: "#16A34A", secondary: "#FFFFFF" } },
            error: { iconTheme: { primary: "#DC2626", secondary: "#FFFFFF" } },
          }}
        />
      </body>
    </html>
  );
}
