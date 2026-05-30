"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function OnboardingStepper({
  current,
  stepTwoLabel = "Oferta",
}: {
  current: number;
  stepTwoLabel?: string;
}) {
  const steps = [
    { label: "Negocio", short: "Negocio" },
    { label: stepTwoLabel, short: stepTwoLabel },
    { label: "Confirmar", short: "Listo" },
  ];

  return (
    <div className="mb-8 w-full">
      <p className="mb-4 text-center text-sm text-muted-foreground sm:hidden">
        Paso {current + 1} de {steps.length}
      </p>
      <ol className="flex w-full items-start justify-center">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;

          return (
            <li
              key={step.label}
              className="flex min-w-0 flex-1 items-start last:flex-none last:max-w-[33%]"
            >
              <div className="flex w-full min-w-0 flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all sm:h-10 sm:w-10",
                    done && "border-accent bg-accent text-accent-foreground",
                    active &&
                      "border-primary bg-primary text-primary-foreground shadow-glow",
                    !done &&
                      !active &&
                      "border-border bg-background text-muted-foreground"
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    "w-full truncate px-0.5 text-center text-[11px] font-medium sm:text-sm",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="sm:hidden">{step.short}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
              </div>

              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-1 mt-[18px] hidden h-0.5 min-w-[1.5rem] flex-1 sm:mx-2 sm:block",
                    i < current ? "bg-accent" : "bg-border"
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
