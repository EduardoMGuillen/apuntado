"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
type PlanId = "basic" | "pro";

type AccessInfo = {
  active: boolean;
  reason?: "trial" | "paid" | "expired" | "past_due" | "canceled" | "pending";
  plan: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

const PLANS_UI: Record<
  PlanId,
  { name: string; price: string; description: string; features: string[] }
> = {
  basic: {
    name: "Básico",
    price: "$15",
    description: "Para negocios pequeños",
    features: [
      "Bot WhatsApp 24/7",
      "Agenda automática",
      "Recordatorios 24h",
      "Control manual",
    ],
  },
  pro: {
    name: "Pro",
    price: "$30",
    description: "Para más volumen",
    features: [
      "Todo lo del Básico",
      "Múltiples empleados",
      "Conversaciones ilimitadas",
      "Soporte prioritario",
    ],
  },
};

interface Props {
  businessId: string;
  access: AccessInfo;
  hasStripeCustomer: boolean;
  stripeSimulate?: boolean;
}

export function SubscriptionPlans({
  businessId,
  access,
  hasStripeCustomer,
  stripeSimulate = false,
}: Props) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<PlanId | "portal" | null>(null);

  const success = searchParams.get("success");
  const simulated = searchParams.get("simulated");
  const canceled = searchParams.get("canceled");
  const needsCard = searchParams.get("needs_card");

  async function checkout(plan: PlanId, withTrial = false) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, plan, trial: withTrial }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.code === "SAME_PLAN") {
        alert("Ya tenés este plan activo.");
        return;
      }
      alert(data.error || "Error al activar plan");
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Error al abrir portal");
    } finally {
      setLoading(null);
    }
  }

  const currentPlan = access.plan as PlanId;

  return (
    <div className="space-y-6">
      {stripeSimulate && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <strong>Modo demo:</strong> Stripe no está configurado. Al elegir un plan se
          activa al instante sin cobro real (simulación local).
        </div>
      )}

      {(success || simulated || searchParams.get("plan_changed")) && (
        <div className="rounded-lg border border-accent/50 bg-accent/10 p-4 text-sm">
          {searchParams.get("plan_changed")
            ? "Plan actualizado. Solo tenés un plan activo a la vez."
            : simulated
              ? "Plan activado en modo demo. Ya podés usar el bot."
              : "¡Pago exitoso! Tu suscripción se activará en unos segundos."}
        </div>
      )}
      {(canceled || needsCard) && !stripeSimulate && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          {needsCard
            ? "Para usar Apuntado necesitás registrar una tarjeta. No se cobra nada durante los 14 días de prueba."
            : "Registro cancelado. Podés intentar de nuevo cuando quieras."}
        </div>
      )}

      {access.reason === "pending" && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="mb-2">
            Elegí <strong>un solo plan</strong> para tu prueba de 14 días
            {stripeSimulate ? " (modo demo)." : " con tarjeta."}
          </p>
          <p className="text-muted-foreground text-xs">
            Solo podés tener Básico o Pro activo, no ambos.
          </p>
        </div>
      )}

      {!access.active && access.reason !== "pending" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          Tu prueba terminó o la suscripción está inactiva. El bot de WhatsApp no
          responderá hasta que actives un plan.
        </div>
      )}

      {(access.reason === "trial" || (access.active && access.trialEndsAt)) &&
        access.trialEndsAt && (
          <p className="text-sm text-muted-foreground">
            Prueba hasta:{" "}
            <strong>
              {new Date(access.trialEndsAt).toLocaleDateString("es", {
                dateStyle: "long",
              })}
            </strong>
            {" · "}
            Plan: <span className="capitalize">{access.plan}</span>
          </p>
        )}

      {hasStripeCustomer && !stripeSimulate && (
        <Button variant="outline" onClick={openPortal} disabled={loading === "portal"}>
          {loading === "portal" ? "Abriendo..." : "Administrar facturación"}
        </Button>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(["basic", "pro"] as PlanId[]).map((plan) => {
          const p = PLANS_UI[plan];
          const isCurrent = access.active && currentPlan === plan;
          const canSwitch = access.active && !isCurrent;

          return (
            <Card
              key={plan}
              className={isCurrent ? "border-primary ring-1 ring-primary" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{p.name}</CardTitle>
                  {isCurrent && <Badge>Plan actual</Badge>}
                </div>
                <CardDescription>{p.description}</CardDescription>
                <p className="text-3xl font-bold">
                  {p.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mes
                  </span>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan === "pro" ? "default" : "outline"}
                  disabled={isCurrent || loading !== null}
                  onClick={() =>
                    checkout(
                      plan,
                      access.reason === "pending" &&
                        (stripeSimulate || !access.active)
                    )
                  }
                >
                  {loading === plan
                    ? "Activando..."
                    : isCurrent
                      ? "Plan actual"
                      : canSwitch
                        ? `Cambiar a ${p.name}`
                        : access.reason === "pending"
                          ? stripeSimulate
                            ? `Empezar con ${p.name}`
                            : `Probar ${p.name}`
                          : stripeSimulate
                            ? `Activar ${p.name} (demo)`
                            : "Suscribirme"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
