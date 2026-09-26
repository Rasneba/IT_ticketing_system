import {SkeletonHeader, SkeletonStats, SkeletonCards } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonStats count={3} />
      <SkeletonCards count={3} />
    </div>
  );
}
