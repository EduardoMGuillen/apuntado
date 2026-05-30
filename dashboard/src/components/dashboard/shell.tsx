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
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-4">
          <Logo size={28} />
        </div>

        <div className="border-b p-4">
          <p className="truncate font-medium">{business.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                business.whatsappSession?.connected
                  ? "bg-accent"
                  : "bg-destructive"
              )}
            />
            <span className="text-xs text-muted-foreground">
              {business.whatsappSession?.connected ? "WhatsApp activo" : "Sin conexión"}
            </span>
          </div>
          {business.subscription && (
            <Badge variant="secondary" className="mt-2 capitalize">
              {business.subscription.plan}
            </Badge>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const path = `${base}${href}`;
            const active =
              href === ""
                ? pathname === base
                : pathname.startsWith(path);

            return (
              <Link
                key={href}
                href={path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
