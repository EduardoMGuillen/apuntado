"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Loader2, Unlink } from "lucide-react";

type Status = {
  featureAvailable: boolean;
  oauthConfigured: boolean;
  connected: boolean;
  googleEmail: string | null;
  calendarId: string | null;
  calendarSummary: string | null;
};

type CalendarOption = {
  id: string;
  summary: string;
  primary: boolean;
};

export function GoogleCalendarCard({
  businessId,
  featureAvailable,
  initialConnected,
  initialEmail,
  initialCalendarId,
  initialCalendarSummary,
  urlHint,
}: {
  businessId: string;
  featureAvailable: boolean;
  initialConnected: boolean;
  initialEmail: string | null;
  initialCalendarId: string | null;
  initialCalendarSummary: string | null;
  urlHint?: string | null;
}) {
  const [status, setStatus] = useState<Status>({
    featureAvailable,
    oauthConfigured: true,
    connected: initialConnected,
    googleEmail: initialEmail,
    calendarId: initialCalendarId,
    calendarSummary: initialCalendarSummary,
  });
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedId, setSelectedId] = useState(initialCalendarId ?? "primary");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const refreshStatus = useCallback(async () => {
    const res = await fetch(`/api/business/${businessId}/google-calendar`);
    if (res.ok) {
      const data = (await res.json()) as Status;
      setStatus(data);
      if (data.calendarId) setSelectedId(data.calendarId);
    }
  }, [businessId]);

  const loadCalendars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/business/${businessId}/google-calendar/calendars`);
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (urlHint === "connected") {
      setMessage("Google Calendar conectado. Tus citas futuras se están sincronizando.");
      refreshStatus();
    } else if (urlHint === "denied") {
      setMessage("No se otorgó permiso a Google.");
    } else if (urlHint === "error") {
      setMessage("Error al conectar. Intentá de nuevo.");
    } else if (urlHint === "expired") {
      setMessage("La sesión de conexión expiró. Volvé a intentar.");
    }
  }, [urlHint, refreshStatus]);

  useEffect(() => {
    if (status.connected) loadCalendars();
  }, [status.connected, loadCalendars]);

  function handleConnect() {
    window.location.href = `/api/business/${businessId}/google-calendar/connect`;
  }

  async function handleDisconnect() {
    if (!confirm("¿Desconectar Google Calendar? Los eventos ya creados en Google no se borran.")) {
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/business/${businessId}/google-calendar`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStatus((s) => ({
          ...s,
          connected: false,
          googleEmail: null,
          calendarId: null,
          calendarSummary: null,
        }));
        setMessage("Desconectado.");
        setCalendars([]);
      } else {
        setMessage("No se pudo desconectar.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCalendar() {
    const cal = calendars.find((c) => c.id === selectedId);
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/business/${businessId}/google-calendar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId: selectedId,
          calendarSummary: cal?.summary ?? selectedId,
        }),
      });
      if (res.ok) {
        setMessage("Calendario guardado. Se sincronizan citas y se bloquean horarios ocupados.");
        await refreshStatus();
      } else {
        setMessage("Error al guardar calendario.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!featureAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Disponible con suscripción activa (plan Básico o Pro). Activá tu plan en
            Suscripción para conectar tu calendario.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Un calendario por negocio. Las citas de Apuntado se crean en Google y el bot
          no agenda sobre horarios ya ocupados en ese calendario. Compartí el calendario
          con tu equipo desde Google si quieren verlo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.oauthConfigured && (
          <p className="text-sm text-destructive">
            La integración no está configurada en el servidor (GOOGLE_CLIENT_ID).
          </p>
        )}

        {!status.connected ? (
          <Button
            type="button"
            onClick={handleConnect}
            disabled={!status.oauthConfigured}
          >
            Conectar con Google
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              <span className="text-muted-foreground">Cuenta:</span>{" "}
              {status.googleEmail || "—"}
            </p>

            <div className="space-y-2">
              <Label htmlFor="gcal-select">Calendario</Label>
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando calendarios…
                </p>
              ) : (
                <select
                  id="gcal-select"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {calendars.length === 0 ? (
                    <option value={status.calendarId ?? "primary"}>
                      {status.calendarSummary ?? "Principal"}
                    </option>
                  ) : (
                    calendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.summary}
                        {c.primary ? " (principal)" : ""}
                      </option>
                    ))
                  )}
                </select>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={saving || loading}
                onClick={handleSaveCalendar}
              >
                Guardar calendario
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={handleDisconnect}
            >
              <Unlink className="mr-2 h-4 w-4" />
              Desconectar
            </Button>
          </div>
        )}

        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
