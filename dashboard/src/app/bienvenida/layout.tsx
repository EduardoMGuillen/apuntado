import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export default async function BienvenidaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth("/bienvenida");
  return children;
}
