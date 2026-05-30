import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Básico",
    price: "15",
    desc: "Ideal para negocios con un empleado",
    features: [
      "Bot WhatsApp 24/7",
      "Agenda automática",
      "Recordatorios 24h",
      "Control manual",
      "Hasta 200 conversaciones/mes",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    price: "30",
    desc: "Para más volumen y varios empleados",
    features: [
      "Todo lo del plan Básico",
      "Múltiples empleados",
      "Conversaciones ilimitadas",
      "Soporte prioritario",
      "Control manual prioritario",
    ],
    highlight: true,
  },
];

export function LandingPricing() {
  return (
    <section id="precios" className="py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Precios
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparente, en dólares
          </h2>
          <p className="mt-4 text-muted-foreground">
            14 días gratis con tarjeta · Sin cobro durante la prueba · Cancelá cuando querás
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-3xl border p-8 transition-all duration-300",
                plan.highlight
                  ? "border-primary bg-gradient-to-b from-primary/5 to-card shadow-glow scale-[1.02] z-10"
                  : "border-border bg-card hover:border-primary/20 hover:shadow-lg"
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
                  Más popular
                </span>
              )}
              <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/mes</span>
              </div>
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ variant: plan.highlight ? "default" : "outline" }),
                  "mt-8 w-full rounded-full h-11",
                  plan.highlight && "bg-primary hover:bg-primary/90"
                )}
              >
                Empezar prueba gratis
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
