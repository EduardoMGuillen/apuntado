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
import { Plus, Trash2 } from "lucide-react";
import { CA_PHONE_PLACEHOLDER } from "@/lib/region";
import { BUSINESS_TIMEZONES } from "@/lib/timezones";

type TeamMember = {
  id?: string;
  name: string;
  whatsappPhone: string;
};

interface Settings {
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  reminder24h: boolean;
  timezone: string;
  websiteUrl: string | null;
  notifyPhone: string | null;
  teamMembers: TeamMember[];
}

export function SettingsForm({
  businessId,
  initial,
  isPro,
}: {
  businessId: string;
  initial: Settings;
  isPro: boolean;
}) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function updateTeamMember(
    index: number,
    field: keyof TeamMember,
    value: string
  ) {
    setSettings((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      ),
    }));
  }

  function addTeamMember() {
    if (settings.teamMembers.length >= 10) return;
    setSettings((prev) => ({
      ...prev,
      teamMembers: [...prev.teamMembers, { name: "", whatsappPhone: "" }],
    }));
  }

  function removeTeamMember(index: number) {
    setSettings((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const teamMembers = settings.teamMembers.filter(
        (member) => member.name.trim() && member.whatsappPhone.trim()
      );

      const res = await fetch(`/api/business/${businessId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          websiteUrl: settings.websiteUrl?.trim() || null,
          notifyPhone: settings.notifyPhone?.trim() || null,
          teamMembers: isPro ? teamMembers : undefined,
        }),
      });
      if (res.ok) setMessage("Guardado correctamente");
      else setMessage("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot y alertas</CardTitle>
        <CardDescription>
          Citas, recordatorios y notificaciones. Las reglas de respuesta están en
          el menú Reglas; menú y horarios en Personalización.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
          <div>
            <Label htmlFor="notify-phone">WhatsApp para alertas de clientes</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Cuando el bot escale a un agente, recibís un mensaje desde el
              WhatsApp del negocio avisando que hay alguien esperando.
            </p>
          </div>
          <Input
            id="notify-phone"
            placeholder={CA_PHONE_PLACEHOLDER}
            value={settings.notifyPhone || ""}
            onChange={(e) =>
              setSettings({
                ...settings,
                notifyPhone: e.target.value || null,
              })
            }
          />
        </div>

        {isPro && (
          <div className="space-y-3">
            <div>
              <Label>Equipo Pro — alertas a todo el equipo</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                En plan Pro, también se notifica a estos números cuando un
                cliente necesita un agente.
              </p>
            </div>

            {settings.teamMembers.map((member, index) => (
              <div
                key={member.id || index}
                className="grid gap-2 rounded-xl border border-border/80 bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <Input
                  placeholder="Nombre"
                  value={member.name}
                  onChange={(e) =>
                    updateTeamMember(index, "name", e.target.value)
                  }
                />
                <Input
                  placeholder={CA_PHONE_PLACEHOLDER}
                  value={member.whatsappPhone}
                  onChange={(e) =>
                    updateTeamMember(index, "whatsappPhone", e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeTeamMember(index)}
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
              onClick={addTeamMember}
              disabled={settings.teamMembers.length >= 10}
            >
              <Plus className="mr-1 h-4 w-4" />
              Agregar miembro
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Anticipación mínima (minutos)</Label>
            <Input
              type="number"
              value={settings.minAdvanceMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  minAdvanceMinutes: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Máximo días de anticipación</Label>
            <Input
              type="number"
              value={settings.maxAdvanceDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxAdvanceDays: Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Zona horaria del negocio</Label>
          <select
            id="timezone"
            value={settings.timezone}
            onChange={(e) =>
              setSettings({
                ...settings,
                timezone: e.target.value,
              })
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {BUSINESS_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Se usa para disponibilidad, recordatorios y validación de fechas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reminder24h"
            checked={settings.reminder24h}
            onChange={(e) =>
              setSettings({ ...settings, reminder24h: e.target.checked })
            }
            className="h-4 w-4 rounded border"
          />
          <Label htmlFor="reminder24h">Enviar recordatorio 24h antes</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website-url">Sitio web del negocio (opcional)</Label>
          <Input
            id="website-url"
            type="url"
            placeholder="https://minegocio.com"
            value={settings.websiteUrl || ""}
            onChange={(e) =>
              setSettings({
                ...settings,
                websiteUrl: e.target.value || null,
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            El bot revisa esta página para eventos, promos y info actualizada
            (se actualiza cada ~15 min).
          </p>
        </div>

        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </CardContent>
    </Card>
  );
}
