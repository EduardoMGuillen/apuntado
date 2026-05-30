"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingStepper } from "@/components/onboarding/stepper";
import { BUSINESS_TYPE_CATEGORIES, getBusinessTypeLabel } from "@/lib/business-types";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

const DEFAULT_SCHEDULE = [
  { dayOfWeek: 0, openTime: "08:00", closeTime: "12:00", isOpen: false },
  { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 6, openTime: "08:00", closeTime: "14:00", isOpen: true },
];

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const selectClass =
  "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState("salon");
  const [phone, setPhone] = useState("+504");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [serviceName, setServiceName] = useState("");
  const [serviceDuration, setServiceDuration] = useState(30);
  const [servicePrice, setServicePrice] = useState(150);
  const [services, setServices] = useState<
    { name: string; durationMin: number; priceHNL: number }[]
  >([]);

  const [schedules] = useState(DEFAULT_SCHEDULE);

  const canContinueStep0 = name.trim().length >= 2 && phone.length >= 8 && city.trim().length >= 2;

  function addService() {
    if (!serviceName.trim()) return;
    setServices([
      ...services,
      {
        name: serviceName.trim(),
        durationMin: serviceDuration,
        priceHNL: servicePrice,
      },
    ]);
    setServiceName("");
    setServiceDuration(30);
    setServicePrice(150);
  }

  function removeService(index: number) {
    setServices(services.filter((_, i) => i !== index));
  }

  async function handleFinish() {
    if (services.length === 0) {
      setError("Agregá al menos un servicio");
      setStep(1);
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        phone,
        city,
        address: address || undefined,
        services,
        schedules,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al crear negocio");
      setLoading(false);
      return;
    }

    const { id } = await res.json();

    const checkoutRes = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: id, plan: "basic", trial: true }),
    });

    const checkoutData = await checkoutRes.json();
    if (checkoutData.url) {
      window.location.href = checkoutData.url;
      return;
    }

    setError(checkoutData.error || "No se pudo activar la suscripción");
    setLoading(false);
  }

  return (
    <div className="min-h-screen mesh-light">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-6 sm:max-w-2xl sm:px-6 sm:py-10">
        <div className="mb-6 flex justify-center sm:mb-8">
          <Logo size={36} />
        </div>

        <OnboardingStepper current={step} />

        <div className="glass-card flex-1 rounded-2xl p-5 sm:p-8">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-xl font-bold sm:text-2xl">
                  Tu negocio
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contanos sobre tu negocio para configurar el bot
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Nombre del negocio</Label>
                  <Input
                    id="business-name"
                    className="h-11"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Barbería El Centro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-type">Tipo de negocio</Label>
                  <select
                    id="business-type"
                    className={selectClass}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {BUSINESS_TYPE_CATEGORIES.map((category) => (
                      <optgroup key={category.label} label={category.label}>
                        {category.types.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-phone">WhatsApp del negocio</Label>
                  <Input
                    id="business-phone"
                    className="h-11"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+5049XXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato Honduras: +504 seguido de 8 dígitos
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business-city">Ciudad</Label>
                    <Input
                      id="business-city"
                      className="h-11"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Tegucigalpa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-address">Dirección (opcional)</Label>
                    <Input
                      id="business-address"
                      className="h-11"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Colonia, calle..."
                    />
                  </div>
                </div>
              </div>

              <Button
                className="h-11 w-full rounded-full font-semibold"
                onClick={() => setStep(1)}
                disabled={!canContinueStep0}
              >
                Siguiente
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-xl font-bold sm:text-2xl">
                  Servicios
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  ¿Qué servicios ofrecés? Agregá al menos uno.
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-border/80 bg-muted/30 p-4">
                <div className="space-y-2">
                  <Label htmlFor="service-name">Nombre del servicio</Label>
                  <Input
                    id="service-name"
                    className="h-11 bg-background"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="Corte de cabello"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addService();
                      }
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="service-duration">Duración (min)</Label>
                    <Input
                      id="service-duration"
                      type="number"
                      min={15}
                      className="h-11 bg-background"
                      value={serviceDuration}
                      onChange={(e) =>
                        setServiceDuration(Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-price">Precio (L.)</Label>
                    <Input
                      id="service-price"
                      type="number"
                      min={0}
                      className="h-11 bg-background"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(Number(e.target.value))}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-full"
                  onClick={addService}
                  disabled={!serviceName.trim()}
                >
                  Agregar servicio
                </Button>
              </div>

              {services.length > 0 && (
                <ul className="divide-y rounded-xl border border-border/80 bg-background">
                  {services.map((s, i) => (
                    <li
                      key={`${s.name}-${i}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="text-muted-foreground">
                          {s.durationMin} min · L.{s.priceHNL.toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeService(i)}
                        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Eliminar servicio"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-full"
                  onClick={() => setStep(0)}
                >
                  Atrás
                </Button>
                <Button
                  className="h-11 flex-1 rounded-full font-semibold"
                  onClick={() => setStep(2)}
                  disabled={services.length === 0}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-xl font-bold sm:text-2xl">
                  Confirmar
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Revisá tu información. Después activamos tu prueba de 14 días.
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-border/80 bg-muted/30 p-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Negocio
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold">{name}</p>
                  <p className="text-muted-foreground">
                    {getBusinessTypeLabel(type)} · {city}
                  </p>
                  <p className="text-muted-foreground">{phone}</p>
                  {address && (
                    <p className="text-muted-foreground">{address}</p>
                  )}
                </div>

                <div className="border-t border-border/60 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Servicios ({services.length})
                  </p>
                  <ul className="mt-2 space-y-1">
                    {services.map((s, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>{s.name}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {s.durationMin} min · L.{s.priceHNL.toFixed(0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-border/60 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Horario inicial
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {schedules
                      .filter((s) => s.isOpen)
                      .map((s) => (
                        <span
                          key={s.dayOfWeek}
                          className="rounded-full bg-background px-2.5 py-1 text-xs font-medium ring-1 ring-border/80"
                        >
                          {DAY_LABELS[s.dayOfWeek]} {s.openTime}–{s.closeTime}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-full"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Atrás
                </Button>
                <Button
                  className={cn(
                    "h-11 flex-1 rounded-full font-semibold",
                    "bg-accent text-accent-foreground hover:bg-accent/90"
                  )}
                  onClick={handleFinish}
                  disabled={loading}
                >
                  {loading ? "Activando..." : "Activar prueba gratis"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 pb-4 text-center text-xs text-muted-foreground">
          Podés editar horarios y más opciones después en Configuración
        </p>
      </div>
    </div>
  );
}
