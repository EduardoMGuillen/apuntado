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

  useEffect(() => {
    const vpsUrl = process.env.NEXT_PUBLIC_VPS_URL || "http://localhost:3001";
    const socket: Socket = io(vpsUrl, { transports: ["websocket", "polling"] });

    socket.emit("join:business", business.id);

    socket.on("whatsapp:qr", (data: { qr: string }) => {
      setQr(data.qr);
    });

    socket.on("whatsapp:status", (data: { connected: boolean }) => {
      setConnected(data.connected);
      if (data.connected) setQr(null);
    });

    return () => {
      socket.emit("leave:business", business.id);
      socket.disconnect();
    };
  }, [business.id]);

  async function startSession() {
    setLoading(true);
    try {
      await fetch(`/api/business/${business.id}/whatsapp/start`, {
        method: "POST",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (connected || qr) return;

    const poll = async () => {
      const res = await fetch(`/api/business/${business.id}/whatsapp/qr`);
      if (res.ok) {
        const data = await res.json();
        setQr(data.qr);
      }
    };

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [connected, qr, business.id]);

  return (
    <DashboardShell business={business}>
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Conectar WhatsApp</h1>
          <p className="text-muted-foreground">
            Número: {business.phone}
          </p>
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

            {!qr && !connected && (
              <p className="text-sm text-muted-foreground text-center">
                Presioná el botón para generar el código QR
              </p>
            )}

            {connected && (
              <p className="text-sm text-accent-foreground text-center">
                ✅ WhatsApp conectado. El bot ya puede responder mensajes.
              </p>
            )}

            {!connected && (
              <Button onClick={startSession} disabled={loading}>
                {loading ? "Iniciando..." : qr ? "Regenerar QR" : "Generar QR"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
