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

interface Settings {
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  reminder24h: boolean;
  botInstructions: string | null;
}

export function SettingsForm({
  businessId,
  initial,
}: {
  businessId: string;
  initial: Settings;
}) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/business/${businessId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
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
        <CardTitle>Bot de WhatsApp</CardTitle>
        <CardDescription>
          Ajustá cómo responde el asistente a tus clientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Label>Instrucciones extra para el bot</Label>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Ej: Siempre ofrecé corte + barba como combo. No agendamos domingos aunque diga lo contrario..."
            value={settings.botInstructions || ""}
            onChange={(e) =>
              setSettings({
                ...settings,
                botInstructions: e.target.value || null,
              })
            }
          />
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
