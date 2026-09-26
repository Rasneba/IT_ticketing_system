import {SkeletonHeader, SkeletonStats, SkeletonTable } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonStats count={4} />
      <SkeletonTable rows={10} />
    </div>
  );
}
