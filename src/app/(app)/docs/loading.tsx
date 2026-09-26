import {SkeletonHeader, SkeletonCards, SkeletonTable } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-8">
      <SkeletonHeader />
      <SkeletonCards count={3} />
      <SkeletonTable rows={6} />
    </div>
  );
}
