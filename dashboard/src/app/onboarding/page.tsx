"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BUSINESS_TYPES = [
  { value: "salon", label: "Salón de belleza" },
  { value: "barbershop", label: "Barbería" },
  { value: "clinic", label: "Clínica" },
  { value: "dentist", label: "Dentista" },
  { value: "mechanic", label: "Mecánica" },
];

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

  function addService() {
    if (!serviceName.trim()) return;
    setServices([
      ...services,
      {
        name: serviceName,
        durationMin: serviceDuration,
        priceHNL: servicePrice,
      },
    ]);
    setServiceName("");
    setServiceDuration(30);
    setServicePrice(150);
  }

  async function handleFinish() {
    if (services.length === 0) {
      setError("Agregá al menos un servicio");
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
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-lg pt-8">
        <div className="mb-8 flex justify-center">
          <Logo size={40} />
        </div>

        <Tabs value={String(step)} onValueChange={(v) => setStep(Number(v))}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="0">Negocio</TabsTrigger>
            <TabsTrigger value="1">Servicios</TabsTrigger>
            <TabsTrigger value="2">Confirmar</TabsTrigger>
          </TabsList>

          <TabsContent value="0">
            <Card>
              <CardHeader>
                <CardTitle>Tu negocio</CardTitle>
                <CardDescription>Contanos sobre tu negocio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del negocio</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp del negocio</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+5049XXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Dirección (opcional)</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => setStep(1)}
                  disabled={!name || !phone || !city}
                >
                  Siguiente
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="1">
            <Card>
              <CardHeader>
                <CardTitle>Servicios</CardTitle>
                <CardDescription>¿Qué servicios ofrecés?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3 space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="Corte de cabello"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minutos</Label>
                    <Input
                      type="number"
                      value={serviceDuration}
                      onChange={(e) => setServiceDuration(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Precio (L.)</Label>
                    <Input
                      type="number"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(Number(e.target.value))}
                    />
                  </div>
                </div>
                <Button variant="outline" onClick={addService} className="w-full">
                  Agregar servicio
                </Button>

                {services.length > 0 && (
                  <ul className="space-y-2 rounded-md border p-3">
                    {services.map((s, i) => (
                      <li key={i} className="flex justify-between text-sm">
                        <span>{s.name}</span>
                        <span className="text-muted-foreground">
                          {s.durationMin} min · L.{s.priceHNL.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(0)}>
                    Atrás
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setStep(2)}
                    disabled={services.length === 0}
                  >
                    Siguiente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="2">
            <Card>
              <CardHeader>
                <CardTitle>Confirmar</CardTitle>
                <CardDescription>
                  Horario Lun-Sáb 8am-6pm. Siguiente paso: activar prueba (con tarjeta si
                  Stripe está configurado, o modo demo al instante).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border p-4 text-sm space-y-1">
                  <p>
                    <strong>{name}</strong> · {city}
                  </p>
                  <p className="text-muted-foreground">{phone}</p>
                  <p>{services.length} servicio(s)</p>
                  <div className="flex flex-wrap gap-1 pt-2">
                    {schedules
                      .filter((s) => s.isOpen)
                      .map((s) => (
                        <span
                          key={s.dayOfWeek}
                          className="rounded bg-muted px-2 py-0.5 text-xs"
                        >
                          {DAY_LABELS[s.dayOfWeek]} {s.openTime}-{s.closeTime}
                        </span>
                      ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Atrás
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleFinish}
                    disabled={loading}
                  >
                    {loading ? "Activando..." : "Continuar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
