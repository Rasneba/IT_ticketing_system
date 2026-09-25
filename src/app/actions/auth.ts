"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureDatabaseReady } from "@/db/bootstrap";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit-log";

export type LoginState = { error?: string; email?: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  await ensureDatabaseReady();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!email || !password) return { error: "Email and password are required.", email };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const valid = user && user.active ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    await new Promise((r) => setTimeout(r, 350));
    return { error: user && !user.active ? "This account is deactivated." : "Invalid email or password.", email };
  }

  await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await logAudit({ actor: user, action: "auth.login", entityType: "session", summary: "Signed in" });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await logAudit({ actor: user, action: "auth.logout", entityType: "session", summary: "Signed out" });
  redirect("/login");
}
