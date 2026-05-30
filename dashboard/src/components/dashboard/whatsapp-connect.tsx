"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { io, Socket } from "socket.io-client";
import { Loader2 } from "lucide-react";
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

interface Props {
  business: {
    id: string;
    name: string;
    phone: string;
    whatsappSession?: { connected: boolean } | null;
    subscription?: { plan: string; status: string } | null;
  };
}

export function WhatsappConnectClient({ business }: Props) {
  const [connected, setConnected] = useState(
    business.whatsappSession?.connected ?? false
  );
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const loadingStartedAt = useRef<number | null>(null);

  useEffect(() => {
    const vpsUrl = process.env.NEXT_PUBLIC_VPS_URL || "http://localhost:3001";
    const socket: Socket = io(vpsUrl, {
      transports: ["websocket", "polling"],
      path: "/socket.io",
    });

    socket.on("connect_error", () => {
      setStatusHint(
        "No se pudo conectar en tiempo real al servidor. El QR se obtiene por la API."
      );
    });

    socket.emit("join:business", business.id);

    socket.on("whatsapp:qr", (data: { qr: string }) => {
      setQr(data.qr);
      setError(null);
      setStatusHint(null);
      setProgress(100);
      setLoading(false);
      setLoadingPhase("");
    });

    socket.on("whatsapp:status", (data: { connected: boolean }) => {
      setConnected(data.connected);
      if (data.connected) {
        setQr(null);
        setError(null);
        setStatusHint(null);
        setLoading(false);
        setProgress(0);
      }
    });

    return () => {
      socket.emit("leave:business", business.id);
      socket.disconnect();
    };
  }, [business.id]);

  useEffect(() => {
    if (!loading) {
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
  }, [loading]);

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
    setProgress(0);
    setLoadingPhase("");
  }

  async function startSession() {
    setLoading(true);
    setError(null);
    setStatusHint(null);
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
            "No se pudo iniciar la sesión. Revisá VPS_URL en Vercel (https://apuntado-vps.fly.dev)."
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
        "El QR no llegó a tiempo. Probá «Regenerar QR». Si sigue fallando, en Fly revisá los logs (fly logs) o reiniciá la app."
      );
      finishLoading();
    } catch {
      setError("Error de red al contactar el servidor. Intentá de nuevo.");
      finishLoading();
    }
  }

  useEffect(() => {
    if (connected || qr || loading) return;

    const interval = setInterval(() => {
      void fetchQrOnce();
    }, 3000);

    return () => clearInterval(interval);
  }, [connected, qr, loading, business.id]);

  const showLoadingBlock = loading && !qr;

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
              Escaneá el QR con WhatsApp en tu celular. El número sigue en tu
              dispositivo.
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
                  <span>{loadingPhase || "Generando QR…"}</span>
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

                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  La primera conexión puede tardar hasta 1 minuto. No cierres
                  esta página.
                </p>
              </div>
            )}

            {!qr && !connected && !loading && (
              <p className="text-center text-sm text-muted-foreground">
                Presioná el botón para generar el código QR
              </p>
            )}

            {statusHint && !loading && !error && (
              <p className="text-center text-sm text-muted-foreground">
                {statusHint}
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
              <Button
                onClick={startSession}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando QR…
                  </span>
                ) : qr ? (
                  "Regenerar QR"
                ) : (
                  "Generar QR"
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
