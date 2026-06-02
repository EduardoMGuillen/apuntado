"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { io, Socket } from "socket.io-client";
import { Loader2, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const QR_POLL_ATTEMPTS = 30;
const QR_POLL_INTERVAL_MS = 2000;
const RECONNECT_POLL_ATTEMPTS = 30;
const RECONNECT_POLL_INTERVAL_MS = 2000;

interface Props {
  business: {
    id: string;
    name: string;
    phone: string;
    whatsappSession?: { connected: boolean } | null;
    subscription?: { plan: string; status: string } | null;
  };
}

type StatusPayload = {
  connected?: boolean;
  hasQr?: boolean;
  hasPersistedAuth?: boolean;
  sessionActive?: boolean;
  warning?: string;
};

export function WhatsappConnectClient({ business }: Props) {
  const [connected, setConnected] = useState(
    business.whatsappSession?.connected ?? false
  );
  const [hasPersistedAuth, setHasPersistedAuth] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [vpsWarning, setVpsWarning] = useState<string | null>(null);
  const loadingStartedAt = useRef<number | null>(null);
  const autoRestoreAttempted = useRef(false);

  const syncConnectionStatus = useCallback(
    async (options?: { ensure?: boolean }) => {
      try {
        const qs = options?.ensure ? "?ensure=true" : "";
        const res = await fetch(
          `/api/business/${business.id}/whatsapp/status${qs}`
        );
        if (!res.ok) return null;
        const data = (await res.json()) as StatusPayload;
        setConnected(!!data.connected);
        if (data.hasPersistedAuth !== undefined) {
          setHasPersistedAuth(!!data.hasPersistedAuth);
        }
        if (data.warning) {
          setVpsWarning(data.warning);
        } else if (!options?.ensure) {
          setVpsWarning(null);
        }
        if (data.connected) {
          setQr(null);
          setError(null);
          setReconnecting(false);
        }
        return data;
      } catch {
        return null;
      }
    },
    [business.id]
  );

  useEffect(() => {
    void (async () => {
      const data = await syncConnectionStatus({ ensure: true });
      if (!data?.connected && !autoRestoreAttempted.current) {
        autoRestoreAttempted.current = true;
        if (data?.hasPersistedAuth) {
          setStatusHint(
            "Hay una sesión guardada en el servidor. Usá «Reconectar» si no se conecta sola."
          );
        }
      }
    })();
  }, [syncConnectionStatus]);

  useEffect(() => {
    const vpsUrl = process.env.NEXT_PUBLIC_VPS_URL || "http://localhost:3001";
    const socket: Socket = io(vpsUrl, {
      transports: ["websocket", "polling"],
      path: "/socket.io",
    });

    socket.on("connect_error", () => {
      setStatusHint(
        "No se pudo conectar en tiempo real al servidor. Usá «Reconectar sesión»."
      );
    });

    socket.emit("join:business", business.id);

    socket.on("whatsapp:qr", (data: { qr: string }) => {
      setQr(data.qr);
      setError(null);
      setStatusHint(null);
      setProgress(100);
      setLoading(false);
      setReconnecting(false);
      setLoadingPhase("");
    });

    socket.on("whatsapp:status", (data: { connected: boolean }) => {
      setConnected(data.connected);
      if (data.connected) {
        setQr(null);
        setError(null);
        setStatusHint(null);
        setLoading(false);
        setReconnecting(false);
        setProgress(0);
        void syncConnectionStatus();
      }
    });

    return () => {
      socket.emit("leave:business", business.id);
      socket.disconnect();
    };
  }, [business.id, syncConnectionStatus]);

  useEffect(() => {
    if (!loading && !reconnecting) {
      loadingStartedAt.current = null;
      setElapsedSec(0);
      return;
    }

    loadingStartedAt.current = Date.now();
    const tick = setInterval(() => {
      if (loadingStartedAt.current) {
        setElapsedSec(
          Math.floor((Date.now() - loadingStartedAt.current) / 1000)
        );
      }
    }, 1000);

    const creep = setInterval(() => {
      setProgress((p) => (p < 88 ? p + 0.8 : p));
    }, 400);

    return () => {
      clearInterval(tick);
      clearInterval(creep);
    };
  }, [loading, reconnecting]);

  async function fetchQrOnce() {
    const res = await fetch(`/api/business/${business.id}/whatsapp/qr`);
    if (res.ok) {
      const data = await res.json();
      if (data.qr) {
        setQr(data.qr);
        setProgress(100);
        return true;
      }
    }
    return false;
  }

  function finishLoading() {
    setLoading(false);
    setReconnecting(false);
    setProgress(0);
    setLoadingPhase("");
  }

  async function pollUntilConnected(
    label: string,
    maxAttempts: number
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      setLoadingPhase(`${label} (${attempt + 1}/${maxAttempts})…`);
      setProgress(20 + ((attempt + 1) / maxAttempts) * 75);

      const data = await syncConnectionStatus();
      if (data?.connected) {
        setProgress(100);
        setLoadingPhase("¡Conectado!");
        return true;
      }
      if (data?.hasQr) {
        await fetchQrOnce();
        return false;
      }

      await new Promise((r) => setTimeout(r, RECONNECT_POLL_INTERVAL_MS));
    }
    return false;
  }

  async function reconnectSession() {
    setReconnecting(true);
    setLoading(true);
    setError(null);
    setStatusHint(null);
    setVpsWarning(null);
    setProgress(10);
    setLoadingPhase("Reconectando con la sesión guardada…");

    try {
      const res = await fetch(`/api/business/${business.id}/whatsapp/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceQr: false }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          (typeof data.error === "string" ? data.error : null) ||
            "No se pudo reconectar. Revisá que el VPS esté activo en Fly."
        );
        finishLoading();
        return;
      }

      if (data.qr) {
        setQr(data.qr);
        setError(
          "WhatsApp pidió un nuevo código. Escaneá el QR o desvinculá el dispositivo en tu celular y probá de nuevo."
        );
        finishLoading();
        return;
      }

      const ok = await pollUntilConnected(
        "Esperando conexión",
        RECONNECT_POLL_ATTEMPTS
      );

      if (!ok) {
        setError(
          "No se conectó a tiempo. Si en tu celular sigue vinculado, probá «Generar nuevo QR» después de desvincular Apuntado en WhatsApp → Dispositivos vinculados."
        );
      }
      finishLoading();
    } catch {
      setError("Error de red al contactar el servidor. Intentá de nuevo.");
      finishLoading();
    }
  }

  async function startNewQrSession() {
    setLoading(true);
    setError(null);
    setStatusHint(null);
    setVpsWarning(null);
    setProgress(8);
    setLoadingPhase("Conectando con el servidor…");

    try {
      setProgress(15);
      setLoadingPhase("Iniciando sesión de WhatsApp…");

      const res = await fetch(`/api/business/${business.id}/whatsapp/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceQr: true }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          (typeof data.error === "string" ? data.error : null) ||
            "No se pudo iniciar la sesión. Revisá VPS_URL en Vercel."
        );
        finishLoading();
        return;
      }

      if (data.qr) {
        setQr(data.qr);
        setProgress(100);
        setLoadingPhase("¡Listo!");
        setTimeout(finishLoading, 400);
        return;
      }

      setProgress(42);
      setLoadingPhase("Generando código QR…");

      for (let attempt = 0; attempt < QR_POLL_ATTEMPTS; attempt++) {
        await new Promise((r) => setTimeout(r, QR_POLL_INTERVAL_MS));
        setProgress(42 + ((attempt + 1) / QR_POLL_ATTEMPTS) * 52);
        setLoadingPhase(
          `Esperando el código QR… (${attempt + 1}/${QR_POLL_ATTEMPTS})`
        );

        if (await fetchQrOnce()) {
          setLoadingPhase("¡Listo!");
          setTimeout(finishLoading, 400);
          return;
        }
      }

      setError(
        "El QR no llegó a tiempo. Probá de nuevo o revisá los logs en Fly (fly logs -a apuntado-vps)."
      );
      finishLoading();
    } catch {
      setError("Error de red al contactar el servidor. Intentá de nuevo.");
      finishLoading();
    }
  }

  const busy = loading || reconnecting;
  const showLoadingBlock = busy && !qr;

  return (
    <DashboardShell business={business}>
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Conectar WhatsApp</h1>
          <p className="text-muted-foreground">Número: {business.phone}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Estado de conexión</CardTitle>
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? "🟢 Conectado" : "🔴 Desconectado"}
              </Badge>
            </div>
            <CardDescription>
              El panel muestra si el servidor está conectado ahora. En tu celular
              puede seguir apareciendo vinculado aunque aquí diga desconectado.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {qr && !connected && (
              <div className="rounded-xl border bg-white p-4">
                <QRCodeSVG value={qr} size={256} />
              </div>
            )}

            {showLoadingBlock && (
              <div
                className="w-full space-y-4 rounded-xl border border-border/80 bg-muted/30 p-5"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                  <span>{loadingPhase || "Conectando…"}</span>
                </div>

                <div className="space-y-2">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary transition-[width] duration-300 ease-out",
                        progress < 90 && "animate-pulse"
                      )}
                      style={{ width: `${Math.min(100, Math.round(progress))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.min(100, Math.round(progress))}%</span>
                    {elapsedSec > 0 && <span>{elapsedSec}s</span>}
                  </div>
                </div>
              </div>
            )}

            {!qr && !connected && !busy && (
              <p className="text-center text-sm text-muted-foreground">
                {hasPersistedAuth
                  ? "Hay sesión guardada en el servidor. Probá «Reconectar sesión» primero."
                  : "Generá un código QR para vincular WhatsApp."}
              </p>
            )}

            {statusHint && !busy && !error && (
              <p className="text-center text-sm text-muted-foreground">
                {statusHint}
              </p>
            )}

            {vpsWarning && (
              <p className="rounded-lg bg-amber-500/10 p-3 text-center text-sm text-amber-900 dark:text-amber-200">
                Servidor: {vpsWarning}
              </p>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                {error}
              </p>
            )}

            {connected && (
              <p className="text-center text-sm text-accent-foreground">
                ✅ WhatsApp conectado. El bot ya puede responder mensajes.
              </p>
            )}

            {!connected && (
              <div className="flex w-full flex-col gap-2">
                <Button
                  type="button"
                  variant="default"
                  onClick={reconnectSession}
                  disabled={busy}
                  className="w-full"
                >
                  {reconnecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reconectando…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Reconectar sesión
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={startNewQrSession}
                  disabled={busy}
                  className="w-full"
                >
                  {loading && !reconnecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando QR…
                    </span>
                  ) : qr ? (
                    "Regenerar QR (nuevo emparejamiento)"
                  ) : (
                    "Generar nuevo QR"
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Usá «Generar nuevo QR» solo si reconectar falla. Desvinculá
                  Apuntado en WhatsApp del celular antes si ya está vinculado.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
