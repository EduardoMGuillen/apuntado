"use client";

import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { CA_FOOTER_FLAGS } from "@/lib/region";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Calendar, MessageCircle, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: MessageCircle,
    title: "Conectá WhatsApp",
    desc: "Escaneá el QR y tu bot queda listo en minutos.",
  },
  {
    icon: Calendar,
    title: "Configurá tu agenda",
    desc: "Servicios, horarios y precios en lempiras.",
  },
  {
    icon: Sparkles,
    title: "Recibí citas solas",
    desc: "Tus clientes escriben y Apuntado confirma por vos.",
  },
];

export function GreetingScreen({ firstName }: { firstName: string }) {
  return (
    <div className="relative min-h-dvh-screen mesh-hero grid-pattern overflow-hidden">
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background to-transparent" />

      <div className="container relative mx-auto flex min-h-dvh-screen max-w-2xl flex-col items-center justify-center px-4 px-safe py-16 pb-safe pt-safe text-center">
        <Logo size={44} className="mb-10 [&_span]:text-white" />

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm text-white/90 backdrop-blur-sm">
          <Sparkles className="h-4 w-4 text-accent" />
          ¡Cuenta creada!
        </div>

        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          ¡Hola, {firstName}!{" "}
          <span className="text-gradient">Bienvenido a Apuntado</span>
        </h1>

        <p className="mt-5 max-w-md text-lg text-white/65">
          Estás a pocos pasos de automatizar tus citas por WhatsApp. Tu prueba de
          14 días empieza cuando termines de configurar tu negocio.
        </p>

        <div className="mt-10 w-full space-y-3 text-left">
          {STEPS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20">
                <Icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-white">{title}</p>
                <p className="text-sm text-white/55">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/onboarding"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-10 inline-flex h-12 w-full max-w-sm rounded-full bg-accent px-8 text-base font-semibold text-accent-foreground shadow-glow-accent hover:bg-accent/90 sm:w-auto"
          )}
        >
          Configurar mi negocio
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>

        <p className="mt-6 text-sm text-white/45">
          Solo te tomará unos 5 minutos
        </p>

        <div className="mt-12 flex items-center gap-3 opacity-60">
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-xs text-white/50">Apuntado · Centroamérica {CA_FOOTER_FLAGS}</span>
        </div>
      </div>
    </div>
  );
}
