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
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
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
const MESSAGES_PAGE_SIZE = 10;

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
  const [visibleMessages, setVisibleMessages] = useState(MESSAGES_PAGE_SIZE);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const isAtBottomRef = useRef(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find((c) => c.whatsappPhone === selected);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/business/${business.id}/messages?phone=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((data: Message[]) => {
        setMessages(data);
        setVisibleMessages(MESSAGES_PAGE_SIZE);
      });
  }, [selected, business.id]);

  useEffect(() => {
    const vpsUrl = process.env.NEXT_PUBLIC_VPS_URL || "http://localhost:3001";
    const socket: Socket = io(vpsUrl);

    socket.emit("join:business", business.id);

    function upsertCustomerFromMessage(
      customerPhone: string,
      body: string,
      createdAt: string,
      manualTakeover?: boolean
    ) {
      const msgPhone = normalizeWhatsAppPhone(customerPhone);
      setCustomers((prev) => {
        const idx = prev.findIndex(
          (c) => normalizeWhatsAppPhone(c.whatsappPhone) === msgPhone
        );
        if (idx >= 0) {
          return prev.map((c) =>
            normalizeWhatsAppPhone(c.whatsappPhone) === msgPhone
              ? {
                  ...c,
                  lastMessage: body,
                  lastMessageAt: createdAt,
                  ...(manualTakeover
                    ? {
                        manualTakeover: true,
                        takenOverAt: createdAt,
                      }
                    : {}),
                }
              : c
          );
        }
        return [
          {
            whatsappPhone: customerPhone,
            name: null,
            manualTakeover: manualTakeover ?? false,
            takenOverAt: manualTakeover ? createdAt : null,
            lastMessage: body,
            lastMessageAt: createdAt,
          },
          ...prev,
        ];
      });
    }

    socket.on("message:new", (msg: Message & { customerPhone: string }) => {
      const msgPhone = normalizeWhatsAppPhone(msg.customerPhone);
      if (selected && msgPhone === normalizeWhatsAppPhone(selected)) {
        setMessages((prev) => [...prev, msg]);
        if (!isAtBottomRef.current) {
          setUnreadCount((prev) => prev + 1);
        }
      }
      upsertCustomerFromMessage(msg.customerPhone, msg.body, msg.createdAt);
    });

    socket.on(
      "takeover:active",
      (payload: { customerPhone: string; body: string; createdAt: string }) => {
        upsertCustomerFromMessage(
          payload.customerPhone,
          payload.body,
          payload.createdAt,
          true
        );
      }
    );

    return () => {
      socket.emit("leave:business", business.id);
      socket.disconnect();
    };
  }, [business.id, selected]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 80;
      setIsAtBottom(nearBottom);
      isAtBottomRef.current = nearBottom;
      if (nearBottom) setUnreadCount(0);
    };
    container.addEventListener("scroll", onScroll);
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [selected, messages.length]);

  const startIndex = Math.max(0, messages.length - visibleMessages);
  const visibleSlice = messages.slice(startIndex);
  const hasOlderMessages = startIndex > 0;

  function loadOlderMessages() {
    setVisibleMessages((prev) => Math.min(messages.length, prev + MESSAGES_PAGE_SIZE));
  }

  function jumpToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadCount(0);
  }

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
      return (
        <Badge variant="outline">🟡 Control manual</Badge>
      );
    }
    return <Badge variant="secondary">🟢 Bot activo</Badge>;
  }

  return (
    <DashboardShell business={business}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <h1 className="text-xl font-bold md:text-2xl">Conversaciones</h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={refreshConversations}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Refrescar</span>
          </Button>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border md:h-[calc(100dvh-11rem)] md:max-h-[calc(100dvh-11rem)] md:flex-row">
          <div
            className={cn(
              "flex w-full shrink-0 flex-col overflow-y-auto border-border bg-background md:w-72 md:border-r",
              "max-md:absolute max-md:inset-0 max-md:z-10",
              selected && "max-md:hidden"
            )}
          >
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

          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col bg-background",
              !selected && "max-md:hidden"
            )}
          >
            {selectedCustomer ? (
              <>
                <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-start sm:justify-between md:p-4">
                  <div className="flex min-w-0 items-start gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 md:hidden"
                      aria-label="Volver a la lista"
                      onClick={() => setSelected(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                    <p className="font-medium truncate">
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
                  </div>
                  <div className="flex shrink-0 gap-2 pl-11 sm:pl-0">
                    {selectedCustomer.manualTakeover ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => toggleTakeover(false)}
                      >
                        Devolver al bot
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => toggleTakeover(true)}
                      >
                        Tomar control
                      </Button>
                    )}
                  </div>
                </div>

                <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto p-3 space-y-3 md:p-4">
                  {hasOlderMessages && (
                    <div className="sticky top-0 z-10 flex justify-center pb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadOlderMessages}
                        className="bg-background/90 backdrop-blur"
                      >
                        Ver anteriores
                      </Button>
                    </div>
                  )}
                  {visibleSlice.map((m, i) => (
                    <div
                      key={`${m.createdAt}-${i}`}
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
                  {!isAtBottom && (
                    <div className="sticky bottom-2 z-10 mt-2 flex justify-center">
                      <Button
                        type="button"
                        size="sm"
                        onClick={jumpToBottom}
                        className="shadow-md"
                      >
                        Ir al final
                        {unreadCount > 0 ? ` (${unreadCount} nuevo${unreadCount > 1 ? "s" : ""})` : ""}
                      </Button>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {selectedCustomer.manualTakeover && (
                  <div className="shrink-0 flex flex-col gap-2 border-t bg-background p-3 pb-safe md:p-4 md:pb-4">
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
              <div className="hidden flex-1 items-center justify-center text-muted-foreground md:flex">
                Seleccioná una conversación
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
