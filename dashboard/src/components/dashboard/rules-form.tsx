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

export function RulesForm({
  businessId,
  initial,
}: {
  businessId: string;
  initial: {
    botPlaybooks: BotPlaybook[];
    botInstructions: string | null;
  };
}) {
  const [botPlaybooks, setBotPlaybooks] = useState(initial.botPlaybooks);
  const [botInstructions, setBotInstructions] = useState(
    initial.botInstructions || ""
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function updatePlaybook(index: number, field: keyof BotPlaybook, value: string) {
    setBotPlaybooks((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const playbooks = botPlaybooks.filter(
        (item) => item.when.trim() && item.action.trim()
      );

      const res = await fetch(`/api/business/${businessId}/rules`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botPlaybooks: playbooks.length > 0 ? playbooks : null,
          botInstructions: botInstructions.trim() || null,
        }),
      });

      if (res.ok) setMessage("Reglas guardadas");
      else {
        const data = await res.json();
        setMessage(data.error || "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas del bot</CardTitle>
        <CardDescription>
          Qué debe hacer el asistente en situaciones específicas. Usá{" "}
          <code className="text-xs">ESCALAR_AGENTE</code> en la acción para
          avisar al equipo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {botPlaybooks.map((playbook, index) => (
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
              onClick={() =>
                setBotPlaybooks((prev) => prev.filter((_, i) => i !== index))
              }
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
          onClick={() =>
            setBotPlaybooks((prev) => [...prev, { when: "", action: "" }])
          }
          disabled={botPlaybooks.length >= 10}
        >
          <Plus className="mr-1 h-4 w-4" />
          Agregar regla
        </Button>

        <div className="space-y-2">
          <Label>Notas extra para el bot</Label>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Ej: No agendamos domingos. Siempre ofrecé combo corte + barba..."
            value={botInstructions}
            onChange={(e) => setBotInstructions(e.target.value)}
          />
        </div>

        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar reglas"}
        </Button>
      </CardContent>
    </Card>
  );
}
