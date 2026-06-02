"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (!ok) return;

    void navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setEnabled(!!sub && Notification.permission === "granted");
    });
  }, []);

  async function enablePush() {
    if (!supported) return;
    setLoading(true);
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY");

      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Permiso denegado");

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("No se pudo guardar suscripción");
      setEnabled(true);
    } catch (err) {
      console.error("[PushToggle]", err);
    } finally {
      setLoading(false);
    }
  }

  async function disablePush() {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      } else {
        await fetch("/api/push/subscribe", { method: "DELETE" });
      }
      setEnabled(false);
    } catch (err) {
      console.error("[PushToggle]", err);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return enabled ? (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start gap-3 text-white/55 hover:bg-white/5 hover:text-white"
      disabled={loading}
      onClick={disablePush}
    >
      <BellOff className="h-4 w-4" />
      Desactivar push
    </Button>
  ) : (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start gap-3 text-white/55 hover:bg-white/5 hover:text-white"
      disabled={loading}
      onClick={enablePush}
    >
      <Bell className="h-4 w-4" />
      Activar push
    </Button>
  );
}
