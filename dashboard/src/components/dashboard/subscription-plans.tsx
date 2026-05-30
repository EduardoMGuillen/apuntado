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
  reason?: "trial" | "paid" | "expired" | "past_due" | "canceled";
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
}

export function SubscriptionPlans({
  businessId,
  access,
  hasStripeCustomer,
}: Props) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<PlanId | "portal" | null>(null);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  async function checkout(plan: PlanId) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Error al iniciar pago");
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

  const currentPlan = access.plan as PlanId | "trial";

  return (
    <div className="space-y-6">
      {success && (
        <div className="rounded-lg border border-accent/50 bg-accent/10 p-4 text-sm">
          ¡Pago exitoso! Tu suscripción se activará en unos segundos.
        </div>
      )}
      {canceled && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Pago cancelado. Podés intentar de nuevo cuando quieras.
        </div>
      )}

      {!access.active && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          Tu prueba terminó o la suscripción está inactiva. El bot de WhatsApp no
          responderá hasta que actives un plan.
        </div>
      )}

      {access.reason === "trial" && access.trialEndsAt && (
        <p className="text-sm text-muted-foreground">
          Prueba gratis hasta:{" "}
          <strong>
            {new Date(access.trialEndsAt).toLocaleDateString("es-HN", {
              dateStyle: "long",
            })}
          </strong>
        </p>
      )}

      {hasStripeCustomer && (
        <Button variant="outline" onClick={openPortal} disabled={loading === "portal"}>
          {loading === "portal" ? "Abriendo..." : "Administrar facturación"}
        </Button>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(["basic", "pro"] as PlanId[]).map((plan) => {
          const p = PLANS_UI[plan];
          const isCurrent =
            access.active && access.reason === "paid" && currentPlan === plan;

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
                  onClick={() => checkout(plan)}
                >
                  {loading === plan
                    ? "Redirigiendo..."
                    : isCurrent
                      ? "Plan activo"
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
