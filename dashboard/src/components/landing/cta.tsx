import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export function LandingCta() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl mesh-hero px-8 py-16 text-center sm:px-16">
          <div className="absolute inset-0 grid-pattern opacity-50" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Dejá de perder citas por WhatsApp
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/65">
              Unite a los negocios en Honduras que ya automatizan sus reservas.
              Configuración en menos de 10 minutos.
            </p>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 inline-flex h-12 rounded-full bg-accent px-10 text-base font-semibold text-accent-foreground shadow-glow-accent hover:bg-accent/90"
              )}
            >
              Crear mi cuenta gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
