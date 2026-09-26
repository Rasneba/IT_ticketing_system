import {SkeletonHeader, SkeletonToolbar, SkeletonTable } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonToolbar width="w-72" />
      <SkeletonTable rows={8} />
    </div>
  );
}
