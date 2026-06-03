import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { PLANS, type PlanId } from "@/lib/plans";
import {
  MARKETING_VALUE_LINES,
  formatPlanPriceHn,
  formatPlanPriceUsd,
} from "@/lib/marketing-copy";
import { PricingDisclaimers } from "@/components/marketing/pricing-disclaimers";
import { HondurasPaymentOptions } from "@/components/billing/honduras-payment-options";

const PLAN_ORDER: PlanId[] = ["basic", "pro"];

export function LandingPricing() {
  return (
    <section id="precios" className="py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Precios
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Menos que una recepcionista part-time
          </h2>
          <p className="mt-4 text-muted-foreground">
            Una cuota mensual todo incluido — sin sumar costos de Meta por mensaje como
            los CRM con API oficial. 14 días gratis con tarjeta · Cancelá cuando querás.
          </p>
          <ul className="mt-6 space-y-2 text-left text-sm text-muted-foreground sm:mx-auto sm:max-w-md">
            {MARKETING_VALUE_LINES.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const highlight = planId === "pro";
            return (
              <div
                key={planId}
                className={cn(
                  "relative flex flex-col rounded-3xl border p-8 transition-all duration-300",
                  highlight
                    ? "border-primary bg-gradient-to-b from-primary/5 to-card shadow-glow scale-[1.02] z-10"
                    : "border-border bg-card hover:border-primary/20 hover:shadow-lg"
                )}
              >
                {highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
                    Más volumen
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-5xl font-bold">
                      {formatPlanPriceUsd(planId)}
                    </span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {formatPlanPriceHn(planId)} en Honduras (referencia)
                  </p>
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
                    buttonVariants({ variant: highlight ? "default" : "outline" }),
                    "mt-8 w-full rounded-full h-11",
                    highlight && "bg-primary hover:bg-primary/90"
                  )}
                >
                  Empezar prueba gratis
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <HondurasPaymentOptions compact />
        </div>

        <PricingDisclaimers className="mt-10" />
      </div>
    </section>
  );
}
