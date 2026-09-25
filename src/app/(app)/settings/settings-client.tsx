"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Plus, ShieldOff } from "lucide-react";
import { createApiKeyAction, revokeApiKeyAction } from "@/app/actions/admin";
import { cn, timeAgo } from "@/lib/utils";
import { EmptyState, buttonClass, inputClass } from "@/components/ui";
import { Spinner } from "@/components/form-controls";
import { CopyButton } from "../tickets/[id]/workbench";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdBy: string | null;
};

export function ApiKeysManager({ keys }: { keys: KeyRow[] }) {
  const [optimistic, revokeLocal] = useOptimistic(keys, (state: KeyRow[], id: string) =>
    state.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k)),
  );
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  return (
    <div className="space-y-4 p-5">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await createApiKeyAction(name);
            if (res.ok && res.data) {
              setCreated(res.data.key);
              setName("");
              toast.success("API key created — copy it now");
            } else if (!res.ok) toast.error(res.error);
          });
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. ZKBio middleware" className={inputClass} />
        <button type="submit" disabled={pending || name.trim().length < 3} className={buttonClass("primary")}>
          {pending ? <Spinner /> : <Plus className="size-4" />} Create
        </button>
      </form>

      {created ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-800">New key — it will not be shown again</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-1.5 font-mono text-xs text-slate-800 ring-1 ring-inset ring-emerald-200">{created}</code>
            <CopyButton text={created} />
          </div>
        </div>
      ) : null}

      {optimistic.length ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {optimistic.map((k) => (
            <li key={k.id} className={cn("flex items-center gap-3 px-4 py-3", k.revokedAt && "opacity-50")}>
              <KeyRound className="size-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{k.name}</p>
                <p className="truncate text-[11px] text-slate-500">
                  <span className="font-mono">{k.prefix}…</span> · created {timeAgo(k.createdAt)}
                  {k.createdBy ? ` by ${k.createdBy}` : ""} · {k.lastUsedAt ? `last used ${timeAgo(k.lastUsedAt)}` : "never used"}
                </p>
              </div>
              {k.revokedAt ? (
                <span className="text-[10px] font-bold uppercase text-red-600">Revoked</span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      revokeLocal(k.id);
                      const res = await revokeApiKeyAction(k.id);
                      if (res.ok) toast.success(res.message ?? "Revoked");
                      else toast.error(res.error);
                    })
                  }
                  className={buttonClass("ghost", "sm", "text-red-600 hover:bg-red-50")}
                >
                  <ShieldOff className="size-3.5" /> Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<KeyRound className="size-5" />} title="No API keys" description="Create a key for your monitoring or webhook middleware." />
      )}
    </div>
  );
}
