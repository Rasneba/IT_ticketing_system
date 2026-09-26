import {SkeletonHeader, SkeletonToolbar, SkeletonTable } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonToolbar />
      <SkeletonTable rows={10} />
    </div>
  );
}
