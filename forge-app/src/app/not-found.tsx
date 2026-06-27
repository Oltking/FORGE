import Link from "next/link";
import { Diamond } from "@/components/Diamond";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md pt-20 text-center">
      <Diamond size={28} className="mx-auto" />
      <h1 className="mt-4 text-2xl font-bold text-white">Not found</h1>
      <p className="mt-2 text-[var(--color-fog)]">This record or page doesn&apos;t exist.</p>
      <Link href="/" className="btn btn-ember mt-6">
        Back to Forge
      </Link>
    </div>
  );
}
