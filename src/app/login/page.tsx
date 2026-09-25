import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, Layers, QrCode, ShieldCheck, Wrench } from "lucide-react";
import { ensureDatabaseReady } from "@/db/bootstrap";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Layers, title: "Multi-domain coverage", text: "HVAC, plumbing, sub-meters & pumps alongside ZKTeco, lock encoders, FreePBX, POS printers and CCTV." },
  { icon: QrCode, title: "Scan-to-Report intake", text: "QR stickers pre-fill asset, exact location and domain — no tenant login required." },
  { icon: Clock, title: "Deterministic SLA engine", text: "P1 30 min · P2 2 h · P3 8 h · P4 24 h response targets with live timers." },
  { icon: Wrench, title: "Resolution workbench", text: "State-machine transitions, technical audit captures and SOP-guided fixes." },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await ensureDatabaseReady();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const { next } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 right-0 size-[480px] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/50">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="font-bold">Building Service Desk</p>
            <p className="text-xs text-slate-400">Marina Heights Residences · Mixed-use apartment tower</p>
          </div>
        </div>
        <div className="relative mt-auto max-w-lg">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            One portal for every system that keeps the building running.
          </h1>
          <p className="mt-4 text-slate-400">
            From a tripped booster pump in the basement to a thermal printer at Mado Coffee, Unit 4B — every fault is
            triaged, timed and resolved with a full audit trail.
          </p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <f.icon className="size-5 text-indigo-300" />
                <p className="mt-3 text-sm font-semibold">{f.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 text-xs text-slate-500">© {new Date().getFullYear()} Marina Heights Facility Management</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Building Service Desk</p>
              <p className="text-xs text-slate-500">Marina Heights Residences</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Staff, technicians and tenants use the same secure portal.</p>
          <LoginForm next={next ?? ""} />
        </div>
      </section>
    </div>
  );
}
