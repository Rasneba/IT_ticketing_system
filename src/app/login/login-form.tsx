"use client";

import { useActionState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/form-controls";
import { Field, inputClass } from "@/components/ui";

const DEMO = [
  { email: "admin@marina.local", name: "Sara Al-Mansouri", role: "Administrator" },
  { email: "manager@marina.local", name: "Omar Haddad", role: "Property Manager" },
  { email: "tech@marina.local", name: "Rajesh Kumar", role: "IT & Security Tech" },
  { email: "tenant@marina.local", name: "Emre Yilmaz", role: "Tenant · Mado Coffee" },
];

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, null);

  return (
    <div className="mt-8 space-y-8">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <FormAlert message={state?.error} />
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state?.email ?? ""}
            className={inputClass}
            placeholder="you@marina.local"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
        <SubmitButton className="w-full" size="lg" pendingLabel="Signing in…">
          Sign in <ArrowRight className="size-4" />
        </SubmitButton>
      </form>

      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <KeyRound className="size-3.5" /> Demo accounts · password <code className="rounded bg-slate-100 px-1 text-slate-600">demo1234</code>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEMO.map((d) => (
            <form key={d.email} action={formAction}>
              <input type="hidden" name="email" value={d.email} />
              <input type="hidden" name="password" value="demo1234" />
              <input type="hidden" name="next" value={next} />
              <button
                type="submit"
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                <p className="text-xs text-slate-500">{d.role}</p>
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
