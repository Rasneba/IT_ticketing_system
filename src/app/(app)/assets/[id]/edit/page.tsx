import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { listUnitsBasic } from "@/lib/queries";
import { isUuid } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import { AssetForm } from "../../asset-client";

export const metadata: Metadata = { title: "Edit asset" };

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!asset) notFound();
  const unitsList = await listUnitsBasic();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader backHref={`/assets/${asset.id}`} backLabel={asset.tag} title={`Edit ${asset.name}`} />
      <AssetForm asset={asset} units={unitsList} />
    </div>
  );
}
