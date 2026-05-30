"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingStepper } from "@/components/onboarding/stepper";
import { BUSINESS_TYPE_CATEGORIES, getBusinessTypeLabel } from "@/lib/business-types";
import {
  BOOKING_MODES,
  getBookingModeConfig,
  getSuggestedBookingMode,
  type BookingMode,
} from "@/lib/booking-modes";
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

type Offering = {
  name: string;
  durationMin?: number;
  priceHNL?: number;
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modeTouched, setModeTouched] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("salon");
  const [bookingMode, setBookingMode] = useState<BookingMode>("services");
  const [phone, setPhone] = useState("+504");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemDuration, setItemDuration] = useState(30);
  const [itemPrice, setItemPrice] = useState<number | "">(150);
  const [offerings, setOfferings] = useState<Offering[]>([]);

  const [schedules] = useState(DEFAULT_SCHEDULE);

  const modeConfig = getBookingModeConfig(bookingMode);

  useEffect(() => {
    if (!modeTouched) {
      setBookingMode(getSuggestedBookingMode(type));
    }
  }, [type, modeTouched]);

  const canContinueStep0 =
    name.trim().length >= 2 && phone.length >= 8 && city.trim().length >= 2;

  const canContinueStep1 =
    bookingMode === "inquiries" || offerings.length > 0;

  function addOffering() {
    if (!itemName.trim()) return;

    const entry: Offering = { name: itemName.trim() };

    if (bookingMode === "services") {
      entry.durationMin = itemDuration;
      entry.priceHNL = itemPrice === "" ? 0 : itemPrice;
    } else if (bookingMode === "menu") {
      entry.priceHNL = itemPrice === "" ? 0 : itemPrice;
    }

    setOfferings([...offerings, entry]);
    setItemName("");
    setItemDuration(30);
    setItemPrice(bookingMode === "menu" ? "" : 150);
  }

  function removeOffering(index: number) {
    setOfferings(offerings.filter((_, i) => i !== index));
  }

  function formatOfferingSummary(item: Offering) {
    if (bookingMode === "menu") {
      return item.priceHNL && item.priceHNL > 0
        ? `L.${item.priceHNL.toFixed(0)}`
        : "Consultar precio";
    }
    return `${item.durationMin ?? 30} min · L.${(item.priceHNL ?? 0).toFixed(0)}`;
  }

  async function handleFinish() {
    if (!canContinueStep1) {
      setError(
        bookingMode === "menu"
          ? "Agregá al menos un ítem al menú"
          : "Agregá al menos un servicio"
      );
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
        bookingMode,
        websiteUrl: websiteUrl.trim() || undefined,
        offerings,
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

        <OnboardingStepper current={step} stepTwoLabel={modeConfig.short} />

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
                  <Label>¿Cómo te escriben por WhatsApp?</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {BOOKING_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setModeTouched(true);
                          setBookingMode(mode.id);
                          setOfferings([]);
                          setItemPrice(mode.id === "menu" ? "" : 150);
                        }}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all",
                          bookingMode === mode.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border/80 bg-background hover:border-primary/30"
                        )}
                      >
                        <span className="text-lg">{mode.icon}</span>
                        <p className="mt-1 text-sm font-semibold">{mode.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {mode.examples}
                        </p>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {modeConfig.description}
                  </p>
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

                <div className="space-y-2">
                  <Label htmlFor="business-website">Sitio web (opcional)</Label>
                  <Input
                    id="business-website"
                    className="h-11"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://minegocio.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si tenés web, el bot puede leer eventos, promos y más info
                    para responder mejor.
                  </p>
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

          {step === 1 && bookingMode === "inquiries" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-xl font-bold sm:text-2xl">
                  Consultas y citas
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  No necesitás cargar un catálogo ahora. El bot agendará consultas
                  generales y vos podés personalizarlo después.
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">¿Qué hará el bot?</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Responder dudas en tono natural</li>
                  <li>Agendar citas según tu horario</li>
                  <li>Preguntar el motivo de la consulta si hace falta</li>
                </ul>
                <p className="mt-3">
                  Podés agregar servicios específicos más adelante en Configuración.
                </p>
              </div>

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
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {step === 1 && bookingMode !== "inquiries" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-xl font-bold sm:text-2xl">
                  {bookingMode === "menu" ? "Tu menú" : "Tus servicios"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {bookingMode === "menu"
                    ? "Agregá platillos o productos. El bot los mostrará por WhatsApp."
                    : "Agregá al menos un servicio con duración y precio."}
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-border/80 bg-muted/30 p-4">
                <div className="space-y-2">
                  <Label htmlFor="item-name">
                    {bookingMode === "menu" ? "Nombre del ítem" : "Nombre del servicio"}
                  </Label>
                  <Input
                    id="item-name"
                    className="h-11 bg-background"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder={
                      bookingMode === "menu" ? "Baleada sencilla" : "Corte de cabello"
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOffering();
                      }
                    }}
                  />
                </div>

                <div
                  className={cn(
                    "grid gap-3",
                    bookingMode === "services" ? "grid-cols-2" : "grid-cols-1"
                  )}
                >
                  {bookingMode === "services" && (
                    <div className="space-y-2">
                      <Label htmlFor="item-duration">Duración (min)</Label>
                      <Input
                        id="item-duration"
                        type="number"
                        min={15}
                        className="h-11 bg-background"
                        value={itemDuration}
                        onChange={(e) =>
                          setItemDuration(Number(e.target.value))
                        }
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="item-price">
                      Precio (L.){bookingMode === "menu" ? " — opcional" : ""}
                    </Label>
                    <Input
                      id="item-price"
                      type="number"
                      min={0}
                      className="h-11 bg-background"
                      value={itemPrice}
                      onChange={(e) =>
                        setItemPrice(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      placeholder={bookingMode === "menu" ? "Dejar vacío si varía" : undefined}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-full"
                  onClick={addOffering}
                  disabled={!itemName.trim()}
                >
                  {bookingMode === "menu" ? "Agregar al menú" : "Agregar servicio"}
                </Button>
              </div>

              {offerings.length > 0 && (
                <ul className="divide-y rounded-xl border border-border/80 bg-background">
                  {offerings.map((item, i) => (
                    <li
                      key={`${item.name}-${i}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-muted-foreground">
                          {formatOfferingSummary(item)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOffering(i)}
                        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Eliminar"
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
                  disabled={!canContinueStep1}
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
                  {websiteUrl.trim() && (
                    <p className="text-muted-foreground">{websiteUrl.trim()}</p>
                  )}
                </div>

                <div className="border-t border-border/60 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Modo del bot
                  </p>
                  <p className="mt-1 font-medium">{modeConfig.label}</p>
                </div>

                <div className="border-t border-border/60 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {bookingMode === "inquiries"
                      ? "Catálogo"
                      : bookingMode === "menu"
                        ? `Menú (${offerings.length})`
                        : `Servicios (${offerings.length})`}
                  </p>
                  {bookingMode === "inquiries" ? (
                    <p className="mt-1 text-muted-foreground">
                      Consultas generales — sin catálogo fijo
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {offerings.map((item, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span>{item.name}</span>
                          <span className="shrink-0 text-muted-foreground">
                            {formatOfferingSummary(item)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
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
          Podés editar menú, servicios y horarios después en Personalización
        </p>
      </div>
    </div>
  );
}
