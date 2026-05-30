import Link from "next/link";
import { cn } from "@/lib/utils";

export function AlertBanner({
  variant = "warning",
  children,
  href,
  linkLabel,
}: {
  variant?: "warning" | "danger" | "info";
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        variant === "danger" && "border-destructive/30 bg-destructive/10",
        variant === "warning" && "border-primary/25 bg-primary/5",
        variant === "info" && "border-accent/30 bg-accent/5"
      )}
    >
      {children}
      {href && linkLabel && (
        <>
          {" "}
          <Link href={href} className="font-semibold text-primary underline-offset-2 hover:underline">
            {linkLabel}
          </Link>
        </>
      )}
    </div>
  );
}
