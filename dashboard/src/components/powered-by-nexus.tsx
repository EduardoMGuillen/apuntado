import { cn } from "@/lib/utils";

const NEXUS_URL = "https://www.nexusglobalsuministros.com/";

export function PoweredByNexus({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Powered by{" "}
      <a
        href={NEXUS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground/80 underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        Nexus Global
      </a>
    </p>
  );
}
