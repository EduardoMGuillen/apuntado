"use client";

import Link from "next/link";
import { MessageCircle, Landmark } from "lucide-react";
import {
  buildBillingWhatsAppUrl,
  getHondurasBillingConfig,
} from "@/lib/billing-honduras";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  businessName?: string;
  planLabel?: string;
  compact?: boolean;
}

export function HondurasPaymentOptions({
  businessName = "mi negocio",
  planLabel = "Básico o Pro",
  compact = false,
}: Props) {
  const billing = getHondurasBillingConfig();
  const waUrl = buildBillingWhatsAppUrl(businessName, planLabel);

  if (!billing.configured) {
    if (compact) return null;
    return (
      <p className="text-xs text-muted-foreground">
        Pagos locales (Click / WhatsApp): configurá{" "}
        <code className="text-[10px]">NEXT_PUBLIC_BILLING_WHATSAPP</code> y datos
        Click en el servidor.
      </p>
    );
  }

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
          Transferencia <strong>Click</strong> o coordinación por WhatsApp con{" "}
          <strong>Nexus Global</strong> (partner de Apuntado). Activamos tu plan al
          confirmar el depósito.
        </p>
      </div>

      {billing.clickBank && billing.clickAccount && (
        <div className="flex gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium">Transferencia Click</p>
            {billing.clickHolder && (
              <p>
                Titular: <span className="font-medium">{billing.clickHolder}</span>
              </p>
            )}
            <p>
              Banco: <span className="font-medium">{billing.clickBank}</span>
            </p>
            <p>
              Cuenta:{" "}
              <span className="font-mono font-medium">{billing.clickAccount}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              En el concepto indicá el nombre de tu negocio y el plan (Básico o Pro).
            </p>
          </div>
        </div>
      )}

      {waUrl && billing.whatsappDisplay && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex gap-2")}
          >
            <MessageCircle className="h-4 w-4" />
            Enviar comprobante por WhatsApp
          </Link>
          <span className="text-xs text-muted-foreground">{billing.whatsappDisplay}</span>
        </div>
      )}
    </div>
  );
}
