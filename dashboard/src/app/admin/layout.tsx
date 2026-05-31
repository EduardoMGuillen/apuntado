import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { AdminShell } from "@/components/admin/shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — Apuntado",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();
  return <AdminShell>{children}</AdminShell>;
}
