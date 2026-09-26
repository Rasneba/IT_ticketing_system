import { Skeleton } from "@/components/ui";

/** Mirrors /track/[token]: centred card, progress rail, then the note list. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="mt-6 h-1.5 w-full rounded-full" />
          <div className="mt-3 flex justify-between">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-10" />
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
