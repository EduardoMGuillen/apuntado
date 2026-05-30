"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { io, Socket } from "socket.io-client";
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
  const [error, setError] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);

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
    });

    socket.on("whatsapp:status", (data: { connected: boolean }) => {
      setConnected(data.connected);
      if (data.connected) {
        setQr(null);
        setError(null);
        setStatusHint(null);
      }
    });

    return () => {
      socket.emit("leave:business", business.id);
      socket.disconnect();
    };
  }, [business.id]);

  async function fetchQrOnce() {
    const res = await fetch(`/api/business/${business.id}/whatsapp/qr`);
    if (res.ok) {
      const data = await res.json();
      if (data.qr) {
        setQr(data.qr);
        return true;
      }
    }
    return false;
  }

  async function startSession() {
    setLoading(true);
    setError(null);
    setStatusHint("Iniciando sesión de WhatsApp…");

    try {
      const res = await fetch(`/api/business/${business.id}/whatsapp/start`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data.error ||
            "No se pudo iniciar la sesión. Revisá que VPS_URL y VPS_SECRET estén en Vercel."
        );
        return;
      }

      if (data.qr) {
        setQr(data.qr);
        setStatusHint(null);
        return;
      }

      setStatusHint(
        data.message || "Esperando código QR… Si no aparece, intentá de nuevo."
      );

      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));
        if (await fetchQrOnce()) {
          setStatusHint(null);
          return;
        }
      }

      setError(
        "El QR no llegó a tiempo. Verificá VPS_SECRET en Vercel y Fly, luego probá otra vez."
      );
    } catch {
      setError("Error de red al contactar el servidor. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (connected || qr || loading) return;

    const interval = setInterval(() => {
      void fetchQrOnce();
    }, 3000);

    return () => clearInterval(interval);
  }, [connected, qr, loading, business.id]);

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

            {!qr && !connected && !loading && (
              <p className="text-center text-sm text-muted-foreground">
                Presioná el botón para generar el código QR
              </p>
            )}

            {loading && (
              <p className="text-center text-sm text-muted-foreground">
                {statusHint || "Generando QR…"}
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
              <Button onClick={startSession} disabled={loading} className="w-full">
                {loading
                  ? "Generando QR…"
                  : qr
                    ? "Regenerar QR"
                    : "Generar QR"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
