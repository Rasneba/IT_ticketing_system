import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listUnitsBasic } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { AssetForm } from "../asset-client";

export const metadata: Metadata = { title: "Register asset" };

export default async function NewAssetPage() {
  await requireRole(["ADMIN", "MANAGER"]);
  const unitsList = await listUnitsBasic();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        backHref="/assets"
        backLabel="Asset registry"
        title="Register asset"
        description="A unique QR token is generated on save — print the sticker from the asset page or the QR labels sheet."
      />
      <AssetForm units={unitsList} />
    </div>
  );
}
