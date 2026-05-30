import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-brand-dark/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:h-[4.5rem] lg:px-8">
        <Logo size={36} className="[&_span]:text-white" />
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#funciones"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            Funciones
          </a>
          <a
            href="#como-funciona"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            Cómo funciona
          </a>
          <a
            href="#precios"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            Precios
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants(),
              "rounded-full bg-accent px-5 text-accent-foreground shadow-glow-accent hover:bg-accent/90"
            )}
          >
            Empezar gratis
          </Link>
        </div>
      </div>
    </header>
  );
}
