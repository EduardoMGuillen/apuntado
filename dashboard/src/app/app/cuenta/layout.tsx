import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/auth-guard";
import { isSuperAdminSession } from "@/lib/business-access";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mi cuenta — Apuntado",
};

export default async function CuentaLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth("/app/cuenta");
  const isAdmin = isSuperAdminSession(session);

  return (
    <div className="min-h-dvh-screen mesh-light">
      <header className="border-b bg-background/95 pt-safe backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-3xl items-center justify-between px-4 px-safe">
          <Link href="/app" className="text-sm font-medium text-primary hover:underline">
            ← Panel
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}
            >
              Admin
            </Link>
          )}
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-6 pb-safe md:py-8">
        {children}
      </main>
    </div>
  );
}
