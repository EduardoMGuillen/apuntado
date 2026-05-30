"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const CIRCLE_SIZE = "size-10"; // 2.5rem — connector aligns to center (mt-5)

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

      <div
        className="mx-auto flex w-full max-w-md items-start sm:max-w-lg"
        role="list"
        aria-label="Pasos del registro"
      >
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.label} className="flex min-w-0 flex-1 items-start">
              <div
                className="flex w-full min-w-0 flex-col items-center gap-2"
                role="listitem"
              >
                <div
                  className={cn(
                    CIRCLE_SIZE,
                    "flex shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold leading-none tabular-nums transition-all",
                    done && "border-accent bg-accent text-accent-foreground",
                    active &&
                      "border-primary bg-primary text-primary-foreground shadow-glow",
                    !done &&
                      !active &&
                      "border-border bg-background text-muted-foreground"
                  )}
                >
                  {done ? (
                    <Check className="size-5 shrink-0" strokeWidth={2.5} />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "w-full px-1 text-center text-[11px] font-medium leading-tight sm:text-sm",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="sm:hidden">{step.short}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
              </div>

              {!isLast && (
                <div
                  className={cn(
                    "mt-5 h-0.5 min-w-[1.25rem] flex-1 shrink",
                    "mx-2 sm:mx-3",
                    i < current ? "bg-accent" : "bg-border"
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
