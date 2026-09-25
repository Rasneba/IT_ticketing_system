import { getCurrentUser } from "@/lib/auth";
import { buildBlueprintPdf, buildOpsBlueprintPdf, buildSrsPdf } from "@/lib/pdf/documents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GENERATORS: Record<string, () => Promise<Uint8Array>> = {
  "srs_building_service_desk.pdf": buildSrsPdf,
  "ticket_management_blueprint.pdf": buildBlueprintPdf,
  "operations_sop_schema_blueprint.pdf": buildOpsBlueprintPdf,
};

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === "TENANT") {
    return Response.json({ error: "unauthorized", message: "Sign in with a staff account to download documents." }, { status: 401 });
  }
  const { file } = await params;
  const generate = GENERATORS[file];
  if (!generate) return Response.json({ error: "not_found", available: Object.keys(GENERATORS) }, { status: 404 });
  const bytes = await generate();
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
