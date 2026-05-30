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
import type { BotPlaybook } from "@/lib/bot-playbooks";
import { Plus, Trash2 } from "lucide-react";

type TeamMember = {
  id?: string;
  name: string;
  whatsappPhone: string;
};

interface Settings {
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  reminder24h: boolean;
  websiteUrl: string | null;
  notifyPhone: string | null;
  teamMembers: TeamMember[];
  botPlaybooks: BotPlaybook[];
  botInstructions: string | null;
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

  function updatePlaybook(index: number, field: keyof BotPlaybook, value: string) {
    setSettings((prev) => ({
      ...prev,
      botPlaybooks: prev.botPlaybooks.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  function addPlaybook() {
    if (settings.botPlaybooks.length >= 10) return;
    setSettings((prev) => ({
      ...prev,
      botPlaybooks: [
        ...prev.botPlaybooks,
        { when: "", action: "" },
      ],
    }));
  }

  function removePlaybook(index: number) {
    setSettings((prev) => ({
      ...prev,
      botPlaybooks: prev.botPlaybooks.filter((_, i) => i !== index),
    }));
  }

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
      teamMembers: [...prev.teamMembers, { name: "", whatsappPhone: "+504" }],
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
      const playbooks = settings.botPlaybooks.filter(
        (item) => item.when.trim() && item.action.trim()
      );

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
          botPlaybooks: playbooks.length > 0 ? playbooks : null,
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
        <CardTitle>Bot de WhatsApp</CardTitle>
        <CardDescription>
          Decile al bot qué hacer en cada situación. Si tenés web, la lee para
          eventos y promos.
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
            placeholder="+5049XXXXXXX"
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
                  placeholder="+5049XXXXXXX"
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

        <div className="space-y-3">
          <div>
            <Label>Reglas de respuesta personalizadas</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Explicale qué hacer en casos específicos. Podés usar{" "}
              <code className="text-xs">ESCALAR_AGENTE</code> en la acción para
              que avise al equipo y diga que un agente se conectará.
            </p>
          </div>

          {settings.botPlaybooks.map((playbook, index) => (
            <div
              key={index}
              className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3"
            >
              <div className="space-y-1">
                <Label className="text-xs">Cuando el cliente...</Label>
                <Input
                  placeholder="pregunte por eventos disponibles"
                  value={playbook.when}
                  onChange={(e) => updatePlaybook(index, "when", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hacé esto...</Label>
                <textarea
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Decile que un agente se conectará pronto e incluí ESCALAR_AGENTE al final."
                  value={playbook.action}
                  onChange={(e) =>
                    updatePlaybook(index, "action", e.target.value)
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => removePlaybook(index)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Quitar regla
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={addPlaybook}
            disabled={settings.botPlaybooks.length >= 10}
          >
            <Plus className="mr-1 h-4 w-4" />
            Agregar regla
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Notas extra para el bot</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Ej: No agendamos domingos. Siempre ofrecé combo corte + barba..."
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
