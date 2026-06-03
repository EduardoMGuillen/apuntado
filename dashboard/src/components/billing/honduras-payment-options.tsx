"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import {
  buildBillingWhatsAppUrl,
  getBillingWhatsAppDisplay,
} from "@/lib/billing-honduras";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  compact?: boolean;
}

export function HondurasPaymentOptions({ compact = false }: Props) {
  const waUrl = buildBillingWhatsAppUrl();
  const display = getBillingWhatsAppDisplay();

  return (
    <div
      className={
        compact
          ? "space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"
          : "space-y-4 rounded-xl border bg-card p-6"
      }
    >
      <div>
        <p className="font-semibold">Pago en Honduras (sin tarjeta internacional)</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Escribinos por WhatsApp y te indicamos cómo pagar con transferencia local.
          No publicamos datos bancarios en la web.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }), "inline-flex gap-2")}
        >
          <MessageCircle className="h-4 w-4" />
          Consultar pago por WhatsApp
        </Link>
        <span className="text-xs text-muted-foreground">{display}</span>
      </div>
    </div>
  );
}
