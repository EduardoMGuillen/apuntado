"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { DashboardShell } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { Loader2, RefreshCw } from "lucide-react";
import {
  formatCustomerLabel,
  formatCustomerSubtitle,
  normalizeWhatsAppPhone,
} from "@/lib/phone";

interface Customer {
  whatsappPhone: string;
  name: string | null;
  manualTakeover: boolean;
  takenOverAt: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface Message {
  body: string;
  fromClient: boolean;
  createdAt: string;
}

interface Props {
  business: {
    id: string;
    name: string;
    whatsappSession?: { connected: boolean } | null;
    subscription?: { plan: string; status: string } | null;
  };
  customers: Customer[];
}

const TZ = "America/Tegucigalpa";

export function ConversationsClient({ business, customers: initial }: Props) {
  const [customers, setCustomers] = useState(initial);
  const [selected, setSelected] = useState<string | null>(
    initial[0]?.whatsappPhone ?? null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find((c) => c.whatsappPhone === selected);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/business/${business.id}/messages?phone=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then(setMessages);
  }, [selected, business.id]);

  useEffect(() => {
    const vpsUrl = process.env.NEXT_PUBLIC_VPS_URL || "http://localhost:3001";
    const socket: Socket = io(vpsUrl);

    socket.emit("join:business", business.id);

    socket.on("message:new", (msg: Message & { customerPhone: string }) => {
      const msgPhone = normalizeWhatsAppPhone(msg.customerPhone);
      if (selected && msgPhone === normalizeWhatsAppPhone(selected)) {
        setMessages((prev) => [...prev, msg]);
      }
      setCustomers((prev) =>
        prev.map((c) =>
          normalizeWhatsAppPhone(c.whatsappPhone) === msgPhone
            ? {
                ...c,
                lastMessage: msg.body,
                lastMessageAt: msg.createdAt,
              }
            : c
        )
      );
    });

    return () => {
      socket.emit("leave:business", business.id);
      socket.disconnect();
    };
  }, [business.id, selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function toggleTakeover(takeover: boolean) {
    if (!selected) return;
    await fetch(`/api/business/${business.id}/takeover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerPhone: selected, manualTakeover: takeover }),
    });
    setCustomers((prev) =>
      prev.map((c) =>
        c.whatsappPhone === selected
          ? {
              ...c,
              manualTakeover: takeover,
              takenOverAt: takeover ? new Date().toISOString() : null,
            }
          : c
      )
    );
  }

  async function refreshConversations() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/business/${business.id}/conversations`);
      if (!res.ok) return;
      const list: Customer[] = await res.json();
      setCustomers(list);

      const current = selected
        ? list.find(
            (c) =>
              normalizeWhatsAppPhone(c.whatsappPhone) ===
              normalizeWhatsAppPhone(selected)
          )?.whatsappPhone ?? list[0]?.whatsappPhone ?? null
        : list[0]?.whatsappPhone ?? null;

      if (current !== selected) {
        setSelected(current);
      } else if (current) {
        const msgRes = await fetch(
          `/api/business/${business.id}/messages?phone=${encodeURIComponent(current)}`
        );
        if (msgRes.ok) {
          setMessages(await msgRes.json());
        }
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    setSendError("");
    const text = reply.trim();
    try {
      const res = await fetch(`/api/business/${business.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerPhone: selected, body: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error || "No se pudo enviar el mensaje");
        return;
      }
      const createdAt =
        data.message?.createdAt ?? new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { body: text, fromClient: false, createdAt },
      ]);
      setCustomers((prev) =>
        prev.map((c) =>
          c.whatsappPhone === selected
            ? { ...c, lastMessage: text, lastMessageAt: createdAt }
            : c
        )
      );
      setReply("");
    } catch {
      setSendError("Error de conexión al enviar");
    } finally {
      setSending(false);
    }
  }

  function statusBadge(customer: Customer) {
    if (customer.manualTakeover) {
      const waiting =
        customer.takenOverAt &&
        Date.now() - new Date(customer.takenOverAt).getTime() > 10 * 60 * 1000;
      return (
        <Badge variant={waiting ? "destructive" : "outline"}>
          {waiting ? "🔴 Esperando +10 min" : "🟡 Control manual"}
        </Badge>
      );
    }
    return <Badge variant="secondary">🟢 Bot activo</Badge>;
  }

  return (
    <DashboardShell business={business}>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Conversaciones</h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshConversations}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refrescar</span>
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden rounded-xl border">
          <div className="w-72 overflow-y-auto border-r">
            {customers.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Aún no hay conversaciones
              </p>
            ) : (
              customers.map((c) => (
                <button
                  key={c.whatsappPhone}
                  onClick={() => setSelected(c.whatsappPhone)}
                  className={cn(
                    "w-full border-b p-3 text-left hover:bg-muted/50",
                    selected === c.whatsappPhone && "bg-muted"
                  )}
                >
                  <p className="truncate font-medium text-sm">
                    {formatCustomerLabel(c.whatsappPhone, c.name)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.lastMessage || formatCustomerSubtitle(c.whatsappPhone)}
                  </p>
                  {c.name && (
                    <p className="truncate text-[10px] text-muted-foreground/80">
                      {formatCustomerSubtitle(c.whatsappPhone)}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="flex flex-1 flex-col">
            {selectedCustomer ? (
              <>
                <div className="flex items-center justify-between border-b p-4">
                  <div>
                    <p className="font-medium">
                      {formatCustomerLabel(
                        selectedCustomer.whatsappPhone,
                        selectedCustomer.name
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCustomerSubtitle(selectedCustomer.whatsappPhone)}
                    </p>
                    <div className="mt-1">{statusBadge(selectedCustomer)}</div>
                  </div>
                  <div className="flex gap-2">
                    {selectedCustomer.manualTakeover ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleTakeover(false)}
                      >
                        Devolver al bot
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => toggleTakeover(true)}>
                        Tomar control
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                        m.fromClient
                          ? "bg-muted mr-auto"
                          : "bg-primary text-primary-foreground ml-auto"
                      )}
                    >
                      <p>{m.body}</p>
                      <p className="mt-1 text-[10px] opacity-70">
                        {formatInTimeZone(
                          new Date(m.createdAt),
                          TZ,
                          "HH:mm",
                          { locale: es }
                        )}
                      </p>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {selectedCustomer.manualTakeover && (
                  <div className="flex flex-col gap-2 border-t p-4">
                    {sendError && (
                      <p className="text-sm text-destructive">{sendError}</p>
                    )}
                    <div className="flex gap-2">
                    <Input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Escribí tu mensaje..."
                      onKeyDown={(e) => e.key === "Enter" && sendReply()}
                    />
                    <Button onClick={sendReply} disabled={sending}>
                      Enviar
                    </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                Seleccioná una conversación
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
