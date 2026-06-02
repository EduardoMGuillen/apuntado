"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { formatPriceHNL } from "@/lib/bot-prompt";

const TZ = "America/Tegucigalpa";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistió",
};

const CLIENT_TYPE_LABELS: Record<string, string> = {
  empresa: "Empresa",
  particular: "Particular",
};

type Appointment = {
  id: string;
  scheduledAt: string;
  status: string;
  customer: { name: string | null; whatsappPhone: string; clientType: string | null };
  service: { name: string; priceHNL: string };
  employee: { name: string } | null;
};

export function AppointmentsList({
  businessId,
  initialAppointments,
}: {
  businessId: string;
  initialAppointments: Appointment[];
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const [rescheduleOpen, setRescheduleOpen] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Record<string, string>>({});

  const nowTs = Date.now();
  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => new Date(a.scheduledAt).getTime() >= nowTs && a.status !== "cancelled")
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        ),
    [appointments, nowTs]
  );
  const recentPast = useMemo(
    () =>
      appointments
        .filter((a) => new Date(a.scheduledAt).getTime() < nowTs || a.status === "cancelled")
        .sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
        )
        .slice(0, 30),
    [appointments, nowTs]
  );

  async function cancelAppointment(id: string) {
    setLoadingId(id);
    setError("");
    try {
      const res = await fetch(`/api/business/${businessId}/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reason: reason[id] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cancelar");
        return;
      }
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function rescheduleAppointment(id: string) {
    const localDate = rescheduleDate[id];
    if (!localDate) return;
    setLoadingId(id);
    setError("");
    try {
      const iso = new Date(localDate).toISOString();
      const res = await fetch(`/api/business/${businessId}/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          scheduledAt: iso,
          reason: reason[id] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo reprogramar");
        return;
      }
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, scheduledAt: data.scheduledAt, status: "confirmed" } : a
        )
      );
      setRescheduleOpen(null);
    } finally {
      setLoadingId(null);
    }
  }

  function Card({ apt }: { apt: Appointment }) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{apt.customer.name || apt.customer.whatsappPhone}</p>
            <div className="mt-0.5 flex flex-wrap gap-1.5">
              {apt.customer.clientType && (
                <Badge variant="outline" className="text-xs font-normal">
                  {CLIENT_TYPE_LABELS[apt.customer.clientType] ?? apt.customer.clientType}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {apt.service.name}
              {apt.employee ? ` · ${apt.employee.name}` : ""}
            </p>
            <p className="text-sm">
              {formatInTimeZone(apt.scheduledAt, TZ, "EEEE d MMM · h:mm a", { locale: es })}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="capitalize">
              {STATUS_LABELS[apt.status] || apt.status}
            </Badge>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatPriceHNL(apt.service.priceHNL)}
            </p>
          </div>
        </div>

        {apt.status !== "cancelled" && (
          <div className="space-y-2">
            <Input
              placeholder="Motivo/nota para cliente (opcional)"
              value={reason[apt.id] || ""}
              onChange={(e) =>
                setReason((prev) => ({ ...prev, [apt.id]: e.target.value }))
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => cancelAppointment(apt.id)}
                disabled={loadingId === apt.id}
              >
                Cancelar cita y notificar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setRescheduleOpen((prev) => (prev === apt.id ? null : apt.id))
                }
                disabled={loadingId === apt.id}
              >
                Mover cita
              </Button>
            </div>

            {rescheduleOpen === apt.id && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                <Input
                  type="datetime-local"
                  value={rescheduleDate[apt.id] || ""}
                  onChange={(e) =>
                    setRescheduleDate((prev) => ({ ...prev, [apt.id]: e.target.value }))
                  }
                  className="max-w-xs"
                />
                <Button
                  type="button"
                  onClick={() => rescheduleAppointment(apt.id)}
                  disabled={loadingId === apt.id || !rescheduleDate[apt.id]}
                >
                  Confirmar cambio y notificar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Próximas</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">No hay citas próximas</p>
        ) : (
          upcoming.map((apt) => <Card key={apt.id} apt={apt} />)
        )}
      </section>

      {recentPast.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Recientes</h2>
          {recentPast.map((apt) => (
            <Card key={apt.id} apt={apt} />
          ))}
        </section>
      )}
    </div>
  );
}
