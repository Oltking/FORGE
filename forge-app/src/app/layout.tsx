import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Forge — Proof of work, for work",
  description:
    "A two-party work attestation protocol on HACD. Seal what you built, have it co-signed, own a permanent credential nobody can edit or erase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-5 py-10 text-xs text-[var(--color-fog)]">
          <p>
            Forge · proof of work, for work. Records anchored on HACD via HIP-15.
            Not financial advice.
          </p>
        </footer>
      </body>
    </html>
  );
}
