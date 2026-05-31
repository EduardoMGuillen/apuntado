import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { Check } from "lucide-react";

import { CA_FOOTER_FLAGS } from "@/lib/region";

const BULLETS = [
  "Bot en español para Centroamérica",
  "Tu número sigue en tu celular",
  "14 días gratis con tarjeta",
];

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden mesh-hero p-10 lg:flex">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="relative">
          <Logo size={40} className="[&_span]:text-white" />
        </div>
        <div className="relative space-y-8">
          <blockquote className="font-display text-3xl font-bold leading-tight text-white">
            &ldquo;Desde que conecté Apuntado, dejé de contestar WhatsApp a las 11 de la noche.&rdquo;
          </blockquote>
          <p className="text-white/60">— Dueño de barbería en San Salvador</p>
          <ul className="space-y-3">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-white/80">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20">
                  <Check className="h-3.5 w-3.5 text-accent" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative flex items-center gap-3">
          <Image
            src="/logo.png"
            alt=""
            width={48}
            height={48}
            className="rounded-xl opacity-80"
          />
          <p className="text-sm text-white/50">Apuntado · Centroamérica {CA_FOOTER_FLAGS}</p>
        </div>
      </div>

      <div className="flex min-h-dvh-screen flex-1 flex-col items-center justify-center bg-background p-6 pb-safe pt-safe mesh-light px-safe">
        <div className="mb-8 lg:hidden">
          <Logo size={44} />
        </div>
        <div className="w-full max-w-md space-y-2 text-center lg:text-left">
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <div className="mt-8 w-full max-w-md">{children}</div>
        <p className="mt-8 text-center text-sm text-muted-foreground lg:hidden">
          <Link href="/" className="text-primary hover:underline">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
