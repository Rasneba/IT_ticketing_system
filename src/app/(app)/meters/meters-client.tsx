"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Gauge, Plus, Trash2 } from "lucide-react";
import { addReadingAction, deleteReadingAction } from "@/app/actions/admin";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { Card, CardHeader, EmptyState, Field, buttonClass, inputClass } from "@/components/ui";
import { Spinner } from "@/components/form-controls";

type Reading = {
  id: string;
  value: number;
  readingAt: string;
  anomaly: boolean;
  note: string | null;
  recordedBy: string | null;
  pending?: boolean;
};

type Op = { type: "add"; reading: Reading } | { type: "remove"; id: string };

export function ReadingPanel({
  meter,
  readings,
  canRecord,
  canDelete,
  me,
}: {
  meter: { id: string; name: string; unit: string; latest: number | null };
  readings: Reading[];
  canRecord: boolean;
  canDelete: boolean;
  me: string;
}) {
  const router = useRouter();
  const [optimistic, apply] = useOptimistic(readings, (state: Reading[], op: Op) =>
    op.type === "add" ? [op.reading, ...state] : state.filter((r) => r.id !== op.id),
  );
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [replaced, setReplaced] = useState(false);

  const sorted = [...optimistic].sort((a, b) => new Date(b.readingAt).getTime() - new Date(a.readingAt).getTime());

  const submit = () => {
    const num = Number(value);
    if (!value || !Number.isFinite(num)) return toast.error("Enter the cumulative register value");
    const snapshot = { value, note, replaced };
    setValue("");
    setNote("");
    setReplaced(false);
    startTransition(async () => {
      apply({
        type: "add",
        reading: { id: `temp-${Date.now()}`, value: num, readingAt: new Date().toISOString(), anomaly: false, note: note || null, recordedBy: me, pending: true },
      });
      const res = await addReadingAction({ assetId: meter.id, value: num, note: snapshot.note, replaced: snapshot.replaced });
      if (!res.ok) {
        toast.error(res.error);
        setValue(snapshot.value);
        setNote(snapshot.note);
        setReplaced(snapshot.replaced);
        return;
      }
      if (res.data?.anomaly) {
        const ticketId = res.data.ticketId;
        toast.warning(res.message ?? "Anomaly detected", ticketId ? { action: { label: "Open ticket", onClick: () => router.push(`/tickets/${ticketId}`) } } : undefined);
      } else toast.success(res.message ?? "Recorded");
    });
  };

  const remove = (id: string) =>
    startTransition(async () => {
      apply({ type: "remove", id });
      const res = await deleteReadingAction(id);
      if (res.ok) toast.success(res.message ?? "Deleted");
      else toast.error(res.error);
    });

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {canRecord ? (
        <Card className="self-start">
          <CardHeader title="Record a reading" description={meter.name} icon={<Plus className="size-4" />} />
          <form
            className="space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Field label={`Cumulative register (${meter.unit})`} required hint={meter.latest !== null ? `Previous: ${formatNumber(meter.latest, 2)} ${meter.unit}` : undefined}>
              <input type="number" step="0.01" min={0} value={value} onChange={(e) => setValue(e.target.value)} className={cn(inputClass, "font-mono text-base")} placeholder="0.00" />
            </Field>
            <Field label="Note">
              <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="Photo ref, observations…" />
            </Field>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={replaced} onChange={(e) => setReplaced(e.target.checked)} className="size-4 rounded border-slate-300 text-indigo-600" />
              Meter replaced (new baseline)
            </label>
            <button type="submit" disabled={pending} className={buttonClass("primary", "md", "w-full")}>
              {pending ? <Spinner /> : <Gauge className="size-4" />} Save reading
            </button>
          </form>
        </Card>
      ) : null}

      <Card className={canRecord ? "xl:col-span-2" : "xl:col-span-3"}>
        <CardHeader title="Reading log" description="Most recent first · consumption is the delta from the previous reading" />
        {sorted.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Taken</th>
                  <th className="px-3 py-2.5 text-right">Register</th>
                  <th className="px-3 py-2.5 text-right">Consumption</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">Recorded by</th>
                  <th className="px-3 py-2.5">Flag</th>
                  {canDelete ? <th className="px-4 py-2.5" /> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((r, i) => {
                  const prev = sorted[i + 1];
                  const delta = prev ? r.value - prev.value : null;
                  return (
                    <tr key={r.id} className={cn(r.pending && "opacity-60", r.anomaly && "bg-red-50/40")}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-600" suppressHydrationWarning>
                        {r.pending ? "Saving…" : formatDateTime(r.readingAt)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-800">{formatNumber(r.value, 2)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        {delta === null ? <span className="text-slate-300">—</span> : <span className={cn(r.anomaly ? "font-bold text-red-600" : "text-slate-700")}>{formatNumber(delta, 2)}</span>}
                      </td>
                      <td className="hidden px-3 py-2.5 text-xs text-slate-500 md:table-cell">{r.recordedBy ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        {r.anomaly ? (
                          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700" title={r.note ?? ""}>
                            <AlertTriangle className="size-3" /> Anomaly
                          </span>
                        ) : r.note ? (
                          <span className="text-[11px] text-slate-400">{r.note}</span>
                        ) : null}
                      </td>
                      {canDelete ? (
                        <td className="px-4 py-2.5 text-right">
                          {!r.pending ? (
                            <button type="button" onClick={() => remove(r.id)} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete reading">
                              <Trash2 className="size-3.5" />
                            </button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Gauge className="size-5" />} title="No readings yet" description="Record the first register value to start the consumption history." />
        )}
      </Card>
    </div>
  );
}
