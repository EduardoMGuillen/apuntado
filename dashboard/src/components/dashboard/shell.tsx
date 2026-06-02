"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Menu,
  User,
  Shield,
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
] as const;

const MOBILE_TAB_HREFS = ["", "/conversaciones", "/citas"] as const;

function NavLinks({
  base,
  pathname,
  variant,
  onNavigate,
}: {
  base: string;
  pathname: string;
  variant: "sidebar" | "sheet";
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const path = `${base}${href}`;
        const active =
          href === "" ? pathname === base : pathname.startsWith(path);

        return (
          <Link
            key={href}
            href={path}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              variant === "sidebar"
                ? active
                  ? "bg-accent/20 text-accent shadow-sm"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
                : active
                  ? "bg-accent/20 text-accent"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", active && "text-accent")} />
            {label}
          </Link>
        );
      })}
    </>
  );
}

function BusinessSummary({
  business,
  waConnected,
  variant,
}: {
  business: Business;
  waConnected: boolean;
  variant: "sidebar" | "sheet";
}) {
  return (
    <div
      className={cn(
        "border-white/10",
        variant === "sidebar" ? "border-b p-4" : "border-b px-4 py-3"
      )}
    >
      <p className="truncate font-display font-semibold text-white">
        {business.name}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full ring-2 ring-white/10",
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
  );
}

export function DashboardShell({
  business,
  children,
}: {
  business: Business;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const base = `/app/${business.id}`;
  const [waConnected, setWaConnected] = useState(
    business.whatsappSession?.connected ?? false
  );
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setWaConnected(business.whatsappSession?.connected ?? false);
  }, [business.whatsappSession?.connected]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const res = await fetch(
          `/api/business/${business.id}/whatsapp/status?ensure=true`
        );
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

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-dvh-screen flex-col bg-muted/30 md:flex-row">
      {/* Escritorio: barra lateral */}
      <aside className="hidden w-[17rem] shrink-0 flex-col border-r border-white/5 bg-brand-dark md:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <Logo size={30} className="[&_span]:text-white" />
        </div>
        <BusinessSummary
          business={business}
          waConnected={waConnected}
          variant="sidebar"
        />
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavLinks base={base} pathname={pathname} variant="sidebar" />
        </nav>
        <div className="space-y-2 border-t border-white/10 p-3">
          <PoweredByNexus className="px-3 text-white/40 [&_a]:text-white/55 [&_a:hover]:text-white" />
          <Link
            href="/app/cuenta"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white"
          >
            <User className="h-4 w-4" />
            Mi cuenta
          </Link>
          {isSuperAdmin && (
            <Link
              href="/admin"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
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
        {/* Móvil / PWA: cabecera */}
        <header className="sticky top-0 z-40 shrink-0 border-b border-border/80 bg-background/95 pt-safe backdrop-blur-md md:hidden">
          <div className="flex h-14 items-center gap-3 px-3 px-safe">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label="Abrir menú"
                />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex w-[min(100vw,18rem)] max-w-[18rem] flex-col gap-0 border-0 bg-brand-dark p-0 pt-safe text-white sm:max-w-[18rem] [&>button]:top-[max(0.75rem,var(--safe-top))] [&>button]:text-white"
            >
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4 px-safe">
                <Logo size={28} className="[&_span]:text-white" />
              </div>
              <BusinessSummary
                business={business}
                waConnected={waConnected}
                variant="sheet"
              />
              <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                <NavLinks
                  base={base}
                  pathname={pathname}
                  variant="sheet"
                  onNavigate={closeMenu}
                />
              </nav>
              <div className="space-y-2 border-t border-white/10 p-3 pb-safe px-safe">
                <PoweredByNexus className="px-3 text-white/40 [&_a]:text-white/55" />
                <Link
                  href="/app/cuenta"
                  onClick={closeMenu}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white"
                >
                  <User className="h-4 w-4" />
                  Mi cuenta
                </Link>
                {isSuperAdmin && (
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-white/55 hover:bg-white/5 hover:text-white"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{business.name}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  waConnected ? "bg-accent" : "bg-destructive"
                )}
              />
              {waConnected ? "WhatsApp activo" : "Sin conexión"}
            </p>
          </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-auto mesh-light">
          <div className="container mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col px-4 py-4 pb-mobile-nav md:px-6 md:py-6 md:pb-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>

        {/* Móvil / PWA: accesos rápidos */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 pb-safe backdrop-blur-md md:hidden"
          aria-label="Navegación principal"
        >
          <div className="grid h-14 grid-cols-4 px-safe">
            {MOBILE_TAB_HREFS.map((href) => {
              const item = NAV.find((n) => n.href === href)!;
              const path = `${base}${href}`;
              const active =
                href === "" ? pathname === base : pathname.startsWith(path);
              const Icon = item.icon;

              return (
                <Link
                  key={href}
                  href={path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-accent")} />
                  <span className="truncate max-w-full">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
              aria-label="Más opciones"
            >
              <Menu className="h-5 w-5" />
              <span>Más</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
