import { Skeleton } from "@/components/ui";

/** Mirrors the narrow single-column form layout of /report. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <Skeleton className="size-8 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-44" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <Skeleton className="h-28 rounded-3xl" />
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
