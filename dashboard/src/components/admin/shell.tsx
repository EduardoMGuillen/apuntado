"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Building2,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Usuarios", icon: Users, exact: false },
  { href: "/admin/businesses", label: "Negocios", icon: Building2, exact: false },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh-screen flex-col bg-muted/30 md:flex-row">
      <aside className="hidden w-[16rem] shrink-0 flex-col border-r border-white/5 bg-brand-dark md:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <Logo size={30} className="[&_span]:text-white" />
        </div>
        <div className="border-b border-white/10 p-4">
          <p className="text-xs uppercase tracking-wide text-white/40">Super admin</p>
          <p className="mt-1 font-display font-semibold text-white">Soporte Apuntado</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-accent/20 text-accent"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-accent")} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-3">
          <Link
            href="/app"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Ir al panel cliente
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-white/55 hover:bg-white/5 hover:text-white"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 pt-safe backdrop-blur-md md:hidden">
          <div className="flex h-14 items-center justify-between px-4 px-safe">
            <Logo size={28} />
            <Link href="/app" className="text-sm text-primary hover:underline">
              Panel
            </Link>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t px-2 py-2 px-safe">
            {NAV.map(({ href, label }) => {
              const active =
                href === "/admin" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 overflow-auto mesh-light">
          <div className="container mx-auto max-w-6xl px-4 py-6 pb-safe md:px-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
