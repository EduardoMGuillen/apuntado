import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Sparkles, Check } from "lucide-react";

function ChatMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] animate-float">
      <div className="absolute -inset-4 rounded-[2.5rem] bg-accent/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b141a] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 bg-[#1f2c34] px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
            <Image src="/logo.png" alt="" width={28} height={28} className="rounded-lg" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Barbería El Centro</p>
            <p className="text-xs text-emerald-400">en línea</p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-sm text-white">
            Hola, ¿tienen espacio para un corte mañana a las 3?
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#1f2c34] px-3 py-2 text-sm text-white/90">
            ¡Hola! Sí chele, mañana a las 3:00 PM tenemos disponible. ¿Te agendo con Marco?
          </div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-sm text-white">
            Dale, con Marco está perfecto 👍
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2">
            <Check className="h-4 w-4 text-accent shrink-0" />
            <p className="text-xs text-accent">
              Cita confirmada · Mañana 3:00 PM · Corte L.150
            </p>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 top-20 hidden rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl lg:block animate-float-delayed">
        <p className="text-xs text-white/60">Citas hoy</p>
        <p className="font-display text-2xl font-bold text-white">12</p>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative min-h-screen mesh-hero grid-pattern overflow-hidden pt-24">
      <div className="container relative mx-auto px-4 pb-20 pt-12 lg:px-8 lg:pt-20">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
          <div className="text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              Hecho para negocios en Honduras
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-[3.5rem]">
              Citas por WhatsApp,{" "}
              <span className="text-gradient">en piloto automático</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/65 lg:mx-0 lg:text-xl">
              Tus clientes escriben como siempre. Apuntado responde, consulta tu
              agenda y confirma citas — sin apps, sin complicaciones. Tu número
              sigue en tu celular.
            </p>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70 lg:justify-start">
              {["14 días gratis", "Sin spam masivo", "Español hondureño", "L. y zona HN"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" />
                    {item}
                  </li>
                )
              )}
            </ul>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 rounded-full bg-accent px-8 text-base font-semibold text-accent-foreground shadow-glow-accent hover:bg-accent/90"
                )}
              >
                Probar 14 días gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="#como-funciona"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "h-12 rounded-full border-white/20 bg-transparent px-8 text-base text-white hover:bg-white/10"
                )}
              >
                Ver cómo funciona
              </Link>
            </div>
          </div>
          <div className="relative lg:pl-8">
            <ChatMockup />
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
