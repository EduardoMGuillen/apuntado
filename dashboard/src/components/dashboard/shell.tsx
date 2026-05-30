"use client";

import { useEffect, useState } from "react";
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
  SlidersHorizontal,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PoweredByNexus } from "@/components/powered-by-nexus";

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
  { href: "/personalizacion", label: "Personalización", icon: SlidersHorizontal },
  { href: "/reglas", label: "Reglas", icon: ScrollText },
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
  const [waConnected, setWaConnected] = useState(
    business.whatsappSession?.connected ?? false
  );

  useEffect(() => {
    setWaConnected(business.whatsappSession?.connected ?? false);
  }, [business.whatsappSession?.connected]);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const res = await fetch(`/api/business/${business.id}/whatsapp/status`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setWaConnected(!!data.connected);
      } catch {
        /* ignore */
      }
    }

    void sync();
    const interval = setInterval(sync, 45_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [business.id]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetch(`/api/business/${business.id}/whatsapp/status`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data) setWaConnected(!!data.connected);
          })
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [business.id]);

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
                waConnected
                  ? "bg-accent shadow-[0_0_8px] shadow-accent/60"
                  : "bg-destructive"
              )}
            />
            <span className="text-xs text-white/50">
              {waConnected ? "WhatsApp activo" : "Sin conexión"}
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

        <div className="border-t border-white/10 p-3 space-y-2">
          <PoweredByNexus className="px-3 text-white/40 [&_a]:text-white/55 [&_a:hover]:text-white" />
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
