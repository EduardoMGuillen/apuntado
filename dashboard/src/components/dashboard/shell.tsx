"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Settings,
  Smartphone,
  LogOut,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Business {
  id: string;
  name: string;
  whatsappSession?: { connected: boolean } | null;
  subscription?: { plan: string; status: string } | null;
}

const NAV = [
  { href: "", label: "Inicio", icon: LayoutDashboard },
  { href: "/conversaciones", label: "Conversaciones", icon: MessageSquare },
  { href: "/citas", label: "Citas", icon: Calendar },
  { href: "/whatsapp", label: "WhatsApp", icon: Smartphone },
  { href: "/suscripcion", label: "Suscripción", icon: CreditCard },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function DashboardShell({
  business,
  children,
}: {
  business: Business;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const base = `/app/${business.id}`;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-[17rem] flex-col border-r border-white/5 bg-brand-dark md:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <Logo size={30} className="[&_span]:text-white" />
        </div>

        <div className="border-b border-white/10 p-4">
          <p className="truncate font-display font-semibold text-white">
            {business.name}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full ring-2 ring-white/10",
                business.whatsappSession?.connected
                  ? "bg-accent shadow-[0_0_8px] shadow-accent/60"
                  : "bg-destructive"
              )}
            />
            <span className="text-xs text-white/50">
              {business.whatsappSession?.connected
                ? "WhatsApp activo"
                : "Sin conexión"}
            </span>
          </div>
          {business.subscription && (
            <Badge
              variant="secondary"
              className="mt-3 capitalize border-0 bg-white/10 text-white/80"
            >
              {business.subscription.plan}
            </Badge>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const path = `${base}${href}`;
            const active =
              href === "" ? pathname === base : pathname.startsWith(path);

            return (
              <Link
                key={href}
                href={path}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-accent/20 text-accent shadow-sm"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-accent")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
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

      <main className="flex-1 overflow-auto mesh-light">
        <div className="container mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
