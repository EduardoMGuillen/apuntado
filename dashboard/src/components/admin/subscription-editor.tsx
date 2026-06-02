"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Subscription = {
  plan: string;
  status: string;
  trialEndsAt: string | null;
};

export function AdminSubscriptionEditor({
  businessId,
  businessName,
  subscription,
}: {
  businessId: string;
  businessName: string;
  subscription: Subscription | null;
}) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(subscription?.plan || "trial");
  const [status, setStatus] = useState(subscription?.status || "active");
  const [trialEndsAt, setTrialEndsAt] = useState(
    subscription?.trialEndsAt
      ? subscription.trialEndsAt.slice(0, 10)
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          status,
          trialEndsAt: trialEndsAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Error al guardar");
        return;
      }
      setMessage("Guardado");
      setOpen(false);
      window.location.reload();
    } catch {
      setMessage("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function extendTrial15Days() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extend_trial_15",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Error al extender prueba");
        return;
      }
      setMessage(
        data.stripeSynced
          ? "Prueba extendida +15 días (Stripe sincronizado)."
          : data.stripeNote
            ? `Prueba extendida +15 días. ${data.stripeNote}`
            : "Prueba extendida +15 días."
      );
      window.location.reload();
    } catch {
      setMessage("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => setOpen((v) => !v)}
      >
        Suscripción
      </Button>
      {open && (
        <div className="mt-3 rounded-xl border bg-background p-4 space-y-3 min-w-[240px]">
          <p className="text-sm font-medium">{businessName}</p>
          <div className="space-y-1">
            <Label htmlFor={`plan-${businessId}`}>Plan</Label>
            <select
              id={`plan-${businessId}`}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="trial">trial</option>
              <option value="basic">basic</option>
              <option value="pro">pro</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`status-${businessId}`}>Estado</Label>
            <select
              id={`status-${businessId}`}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">active</option>
              <option value="past_due">past_due</option>
              <option value="canceled">canceled</option>
              <option value="expired">expired</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`trial-${businessId}`}>Fin de prueba</Label>
            <Input
              id={`trial-${businessId}`}
              type="date"
              value={trialEndsAt}
              onChange={(e) => setTrialEndsAt(e.target.value)}
            />
          </div>
          {message && (
            <p className="text-xs text-muted-foreground">{message}</p>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="rounded-full w-full"
            disabled={loading}
            onClick={extendTrial15Days}
          >
            {loading ? "Procesando..." : "+15 días de prueba"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-full w-full"
            disabled={loading}
            onClick={save}
          >
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      )}
    </div>
  );
}
