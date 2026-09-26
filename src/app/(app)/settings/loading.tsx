import {SkeletonHeader, SkeletonCards } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCards count={3} />
    </div>
  );
}
