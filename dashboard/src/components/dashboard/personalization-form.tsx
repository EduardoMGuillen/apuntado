"use client";

import { useState } from "react";
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
import { BUSINESS_TYPE_CATEGORIES } from "@/lib/business-types";
import {
  BOOKING_MODES,
  getBookingModeConfig,
  type BookingMode,
} from "@/lib/booking-modes";
import {
  DEFAULT_WELCOME_GREETING,
  DEFAULT_WELCOME_OPTIONS,
  WELCOME_MENU_MAX_OPTIONS,
  WELCOME_MENU_MIN_OPTIONS,
} from "@/lib/welcome-menu";
import {
  CONVERSATION_TONES,
  type ConversationTone,
} from "@/lib/conversation-tones";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

const DAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const selectClass =
  "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type ScheduleRow = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
};

type OfferingRow = {
  id?: string;
  name: string;
  durationMin?: number;
  priceHNL?: number;
};

export type PersonalizationInitial = {
  name: string;
  type: string;
  phone: string;
  city: string;
  address: string | null;
  bookingMode: BookingMode;
  conversationTone: ConversationTone;
  welcomeMenuGreeting: string | null;
  welcomeMenuOptions: string[];
  offerings: OfferingRow[];
  schedules: ScheduleRow[];
};

export function PersonalizationForm({
  businessId,
  initial,
}: {
  businessId: string;
  initial: PersonalizationInitial;
}) {
  const [form, setForm] = useState(initial);
  const [itemName, setItemName] = useState("");
  const [itemDuration, setItemDuration] = useState(30);
  const [itemPrice, setItemPrice] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const modeConfig = getBookingModeConfig(form.bookingMode);

  function setBookingMode(mode: BookingMode) {
    setForm((prev) => ({
      ...prev,
      bookingMode: mode,
      welcomeMenuOptions:
        prev.welcomeMenuOptions.length >= WELCOME_MENU_MIN_OPTIONS
          ? prev.welcomeMenuOptions
          : DEFAULT_WELCOME_OPTIONS[mode],
    }));
  }

  function updateSchedule(
    dayOfWeek: number,
    field: keyof ScheduleRow,
    value: string | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      schedules: prev.schedules.map((row) =>
        row.dayOfWeek === dayOfWeek ? { ...row, [field]: value } : row
      ),
    }));
  }

  function addOffering() {
    if (!itemName.trim()) return;
    const entry: OfferingRow = { name: itemName.trim() };
    if (form.bookingMode === "services") {
      entry.durationMin = itemDuration;
      entry.priceHNL = itemPrice === "" ? 0 : itemPrice;
    } else if (form.bookingMode === "menu") {
      entry.priceHNL = itemPrice === "" ? 0 : itemPrice;
    }
    setForm((prev) => ({
      ...prev,
      offerings: [...prev.offerings, entry],
    }));
    setItemName("");
    setItemDuration(30);
    setItemPrice("");
  }

  function removeOffering(index: number) {
    setForm((prev) => ({
      ...prev,
      offerings: prev.offerings.filter((_, i) => i !== index),
    }));
  }

  function addWelcomeOption() {
    if (form.welcomeMenuOptions.length >= WELCOME_MENU_MAX_OPTIONS) return;
    setForm((prev) => ({
      ...prev,
      welcomeMenuOptions: [...prev.welcomeMenuOptions, ""],
    }));
  }

  function updateWelcomeOption(index: number, value: string) {
    setForm((prev) => ({
      ...prev,
      welcomeMenuOptions: prev.welcomeMenuOptions.map((opt, i) =>
        i === index ? value : opt
      ),
    }));
  }

  function removeWelcomeOption(index: number) {
    setForm((prev) => ({
      ...prev,
      welcomeMenuOptions: prev.welcomeMenuOptions.filter((_, i) => i !== index),
    }));
  }

  function loadDefaultWelcomeMenu() {
    setForm((prev) => ({
      ...prev,
      welcomeMenuGreeting: DEFAULT_WELCOME_GREETING,
      welcomeMenuOptions: [...DEFAULT_WELCOME_OPTIONS[prev.bookingMode]],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");

    const welcomeOptions = form.welcomeMenuOptions
      .map((o) => o.trim())
      .filter(Boolean);

    if (welcomeOptions.length < WELCOME_MENU_MIN_OPTIONS) {
      setError(
        `El menú de bienvenida necesita al menos ${WELCOME_MENU_MIN_OPTIONS} opciones`
      );
      setSaving(false);
      return;
    }

    if (
      form.bookingMode !== "inquiries" &&
      form.offerings.length === 0
    ) {
      setError(
        form.bookingMode === "menu"
          ? "Agregá al menos un ítem al menú"
          : "Agregá al menos un servicio"
      );
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/business/${businessId}/personalization`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          phone: form.phone.trim(),
          city: form.city.trim(),
          address: form.address?.trim() || null,
          bookingMode: form.bookingMode,
          offerings:
            form.bookingMode === "inquiries" ? [] : form.offerings,
          schedules: form.schedules,
          welcomeMenuGreeting: form.welcomeMenuGreeting?.trim() || null,
          welcomeMenuOptions: welcomeOptions,
          conversationTone: form.conversationTone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar");
        return;
      }

      if (data.services) {
        setForm((prev) => ({
          ...prev,
          offerings: data.services.map(
            (s: {
              id: string;
              name: string;
              durationMin: number;
              priceHNL: { toString(): string };
            }) => ({
              id: s.id,
              name: s.name,
              durationMin: s.durationMin,
              priceHNL: parseFloat(s.priceHNL.toString()),
            })
          ),
        }));
      }

      setMessage("Cambios guardados");
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const welcomePreview = form.welcomeMenuOptions
    .map((o) => o.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos del negocio</CardTitle>
          <CardDescription>
            Lo mismo que configuraste en el registro — podés actualizarlo cuando
            quieras.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="biz-name">Nombre</Label>
            <Input
              id="biz-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-type">Tipo de negocio</Label>
            <select
              id="biz-type"
              className={selectClass}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {BUSINESS_TYPE_CATEGORIES.map((cat) => (
                <optgroup key={cat.label} label={cat.label}>
                  {cat.types.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="biz-phone">WhatsApp del negocio</Label>
              <Input
                id="biz-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+5049XXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-city">Ciudad</Label>
              <Input
                id="biz-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-address">Dirección (opcional)</Label>
            <Input
              id="biz-address"
              value={form.address || ""}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value || null })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modo del bot</CardTitle>
          <CardDescription>
            Cambiá entre servicios con cita, menú/catálogo o solo consultas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {BOOKING_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setBookingMode(mode.id)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors",
                form.bookingMode === mode.id
                  ? "border-accent bg-accent/10 ring-1 ring-accent/30"
                  : "border-border/80 hover:bg-muted/40"
              )}
            >
              <p className="font-medium">
                {mode.icon} {mode.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode.description}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tono de conversación</CardTitle>
          <CardDescription>
            Cómo suena el bot en WhatsApp: formal, casual, breve, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CONVERSATION_TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, conversationTone: tone.id }))
              }
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors",
                form.conversationTone === tone.id
                  ? "border-accent bg-accent/10 ring-1 ring-accent/30"
                  : "border-border/80 hover:bg-muted/40"
              )}
            >
              <p className="font-medium">{tone.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tone.description}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      {form.bookingMode !== "inquiries" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {form.bookingMode === "menu" ? "Menú / catálogo" : "Servicios"}
            </CardTitle>
            <CardDescription>{modeConfig.examples}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nombre</Label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder={
                    form.bookingMode === "menu"
                      ? "Baleada sencilla"
                      : "Corte de cabello"
                  }
                />
              </div>
              {form.bookingMode === "services" && (
                <div className="space-y-2">
                  <Label>Duración (min)</Label>
                  <Input
                    type="number"
                    min={15}
                    value={itemDuration}
                    onChange={(e) =>
                      setItemDuration(Number(e.target.value) || 30)
                    }
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>
                  Precio (L.)
                  {form.bookingMode === "menu" ? " — opcional" : ""}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={itemPrice}
                  onChange={(e) =>
                    setItemPrice(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={addOffering}
              disabled={!itemName.trim()}
            >
              <Plus className="mr-1 h-4 w-4" />
              {form.bookingMode === "menu" ? "Agregar ítem" : "Agregar servicio"}
            </Button>

            {form.offerings.length > 0 && (
              <ul className="divide-y rounded-xl border">
                {form.offerings.map((item, i) => (
                  <li
                    key={item.id || `${item.name}-${i}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-muted-foreground">
                        {form.bookingMode === "menu"
                          ? item.priceHNL && item.priceHNL > 0
                            ? `L.${item.priceHNL}`
                            : "Consultar precio"
                          : `${item.durationMin ?? 30} min · L.${(item.priceHNL ?? 0).toFixed(0)}`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeOffering(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {form.bookingMode === "inquiries" && (
        <Card>
          <CardHeader>
            <CardTitle>Modo consultas</CardTitle>
            <CardDescription>
              Sin catálogo fijo — el bot agenda consultas generales y responde
              dudas.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Horario de atención</CardTitle>
          <CardDescription>
            Días y horas en que el bot puede ofrecer citas o pedidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.schedules.map((row) => (
            <div
              key={row.dayOfWeek}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/20 p-3"
            >
              <label className="flex min-w-[7rem] items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={row.isOpen}
                  onChange={(e) =>
                    updateSchedule(row.dayOfWeek, "isOpen", e.target.checked)
                  }
                  className="h-4 w-4 rounded"
                />
                {DAY_LABELS[row.dayOfWeek]}
              </label>
              {row.isOpen ? (
                <>
                  <Input
                    type="time"
                    className="w-32"
                    value={row.openTime}
                    onChange={(e) =>
                      updateSchedule(row.dayOfWeek, "openTime", e.target.value)
                    }
                  />
                  <span className="text-muted-foreground">a</span>
                  <Input
                    type="time"
                    className="w-32"
                    value={row.closeTime}
                    onChange={(e) =>
                      updateSchedule(row.dayOfWeek, "closeTime", e.target.value)
                    }
                  />
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Cerrado</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menú de bienvenida en WhatsApp</CardTitle>
          <CardDescription>
            Opciones numeradas que ve el cliente al saludar, por ejemplo: &quot;1.
            Hablar con un agente&quot;, &quot;2. Ver menú&quot;, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mensaje de saludo</Label>
            <Input
              value={form.welcomeMenuGreeting || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  welcomeMenuGreeting: e.target.value || null,
                })
              }
              placeholder={DEFAULT_WELCOME_GREETING}
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Opciones (mín. {WELCOME_MENU_MIN_OPTIONS})</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={loadDefaultWelcomeMenu}
              >
                Restaurar sugeridas
              </Button>
            </div>
            {form.welcomeMenuOptions.map((option, index) => (
              <div key={index} className="flex gap-2">
                <span className="flex h-11 w-8 shrink-0 items-center justify-center text-sm text-muted-foreground">
                  {index + 1}.
                </span>
                <Input
                  value={option}
                  onChange={(e) => updateWelcomeOption(index, e.target.value)}
                  placeholder={`Opción ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive"
                  onClick={() => removeWelcomeOption(index)}
                  disabled={
                    form.welcomeMenuOptions.length <= WELCOME_MENU_MIN_OPTIONS
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={addWelcomeOption}
              disabled={
                form.welcomeMenuOptions.length >= WELCOME_MENU_MAX_OPTIONS
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Agregar opción
            </Button>
          </div>

          {welcomePreview.length > 0 && (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 p-4 text-sm">
              <p className="font-medium text-muted-foreground">Vista previa</p>
              <p className="mt-2 whitespace-pre-wrap">
                {form.welcomeMenuGreeting?.trim() || DEFAULT_WELCOME_GREETING}
                {"\n\n"}
                {welcomePreview
                  .map((opt, i) => `${i + 1}. ${opt}`)
                  .join("\n")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}

      <Button onClick={handleSave} disabled={saving} size="lg" className="rounded-full">
        {saving ? "Guardando..." : "Guardar personalización"}
      </Button>
    </div>
  );
}
