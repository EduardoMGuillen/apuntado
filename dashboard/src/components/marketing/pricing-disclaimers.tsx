import {
  MARKETING_LEGAL_NOTE,
  MARKETING_TRANSPARENCY_NOTE,
} from "@/lib/marketing-copy";

export function PricingDisclaimers({ className = "" }: { className?: string }) {
  return (
    <div
      className={`mx-auto max-w-3xl space-y-2 text-center text-xs text-muted-foreground ${className}`}
    >
      <p>{MARKETING_TRANSPARENCY_NOTE}</p>
      <p>{MARKETING_LEGAL_NOTE}</p>
    </div>
  );
}
