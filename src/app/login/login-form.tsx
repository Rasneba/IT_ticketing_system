"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/form-controls";
import { Field, inputClass } from "@/components/ui";

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
    </div>
  );
}
