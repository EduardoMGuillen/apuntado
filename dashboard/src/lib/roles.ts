import { prisma } from "@/lib/prisma";

export type UserRole = "user" | "super_admin";

export function parseSuperAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string): boolean {
  return parseSuperAdminEmails().includes(email.trim().toLowerCase());
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === "super_admin";
}

/** Sincroniza rol super_admin si el email está en SUPER_ADMIN_EMAILS. */
export async function resolveUserRole(
  userId: string,
  email: string
): Promise<UserRole> {
  if (isSuperAdminEmail(email)) {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "super_admin" },
    });
    return "super_admin";
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === "super_admin" ? "super_admin" : "user";
}
