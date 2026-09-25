import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 ring-8 ring-slate-50">
          <Compass className="size-6" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-1 text-sm text-slate-500">The ticket, asset or page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.</p>
        <Link href="/dashboard" className="mt-6 inline-flex h-9 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
