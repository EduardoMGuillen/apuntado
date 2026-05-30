import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AppAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth("/app");
  return children;
}
