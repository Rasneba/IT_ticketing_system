import { notFound } from "next/navigation";
import { BookOpen, FolderOpen } from "lucide-react";
import { REGISTERS } from "@/lib/pmo/defs";
import { defOf, getProjects, getRegisterData } from "@/lib/pmo/queries";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { LinkButton, PageHeader } from "@/components/ui";
import { RegisterClient } from "@/components/pmo/register-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ reg: string }> }) {
  const { reg } = await params;
  const def = REGISTERS.find((r) => r.key === reg);
  if (!def) return {};
  return { title: `${def.label} · PMO` };
}

export default async function RegisterPage({ params }: { params: Promise<{ reg: string }> }) {
  const user = await requireRole(["ADMIN", "MANAGER", "TECHNICIAN"]);
  const { reg } = await params;
  if (!REGISTERS.some((r) => r.key === reg)) notFound();
  const def = defOf(reg);

  const [rows, projects] = await Promise.all([getRegisterData(reg), getProjects()]);

  return (
    <div>
      <PageHeader
        backHref="/pmo"
        backLabel="PMO home"
        eyebrow={`Sheet ${def.number} of 26`}
        title={def.title}
        description={def.description}
        actions={
          <>
            {def.group === "register" ? (
              <LinkButton href="/pmo/dictionary" variant="secondary" size="sm">
                <BookOpen className="size-4" /> Data dictionary
              </LinkButton>
            ) : null}
            <LinkButton href="/pmo/register/portfolio" variant="secondary" size="sm">
              <FolderOpen className="size-4" /> Portfolio
            </LinkButton>
          </>
        }
      />
      <RegisterClient
        def={def}
        rows={rows}
        projects={projects.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
        canManage={can.manageProjects(user.role)}
      />
    </div>
  );
}