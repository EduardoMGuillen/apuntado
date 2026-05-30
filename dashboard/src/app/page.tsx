import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { Calendar, MessageCircle, CheckCircle2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo size={36} />
          <nav className="flex items-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              Iniciar sesión
            </Link>
            <Link href="/register" className={cn(buttonVariants())}>
              Empezar gratis
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              Micro SaaS para negocios en Honduras
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Citas por WhatsApp,{" "}
              <span className="text-primary">sin complicaciones</span>
            </h1>
            <p className="text-lg text-muted-foreground sm:text-xl">
              Tus clientes escriben como siempre. Apuntado responde, agenda y
              confirma citas automáticamente — el número sigue en tu celular.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
                Prueba 14 días gratis
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                Ya tengo cuenta
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Desde L.375/mes · Sin contratos · Solo respuestas reactivas
            </p>
          </div>
        </section>

        <section className="border-t bg-muted/40 py-16">
          <div className="container mx-auto grid gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: MessageCircle,
                title: "WhatsApp nativo",
                desc: "Tus clientes no descargan nada. Escriben al número que ya conocen.",
              },
              {
                icon: Calendar,
                title: "Agenda automática",
                desc: "El bot consulta tu disponibilidad real y confirma citas al instante.",
              },
              {
                icon: CheckCircle2,
                title: "Control total",
                desc: "Tomá el control manual cuando querés y devolvéselo al bot con un click.",
              },
              {
                icon: Shield,
                title: "Sin spam",
                desc: "Solo respondemos mensajes entrantes. Protegemos tu número de baneos.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="space-y-3 rounded-xl bg-card p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-16" id="precios">
          <h2 className="mb-2 text-center text-2xl font-bold">Precios simples</h2>
          <p className="mb-10 text-center text-muted-foreground">
            14 días gratis · Sin contrato · Cancelá cuando querás
          </p>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            {[
              {
                name: "Básico",
                price: "$15",
                features: ["Bot 24/7", "Agenda automática", "Recordatorios"],
              },
              {
                name: "Pro",
                price: "$30",
                features: ["Todo el Básico", "Multi-empleado", "Soporte prioritario"],
                highlight: true,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 ${plan.highlight ? "border-primary shadow-md" : "bg-card"}`}
              >
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">/mes</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({
                      variant: plan.highlight ? "default" : "outline",
                    }),
                    "mt-6 w-full inline-flex justify-center"
                  )}
                >
                  Empezar gratis
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 text-center">
          <h2 className="mb-8 text-2xl font-bold">Para todo tipo de negocio</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["Salones", "Barberías", "Clínicas", "Dentistas", "Mecánicas"].map(
              (type) => (
                <span
                  key={type}
                  className="rounded-full border bg-card px-4 py-2 text-sm font-medium"
                >
                  {type}
                </span>
              )
            )}
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Apuntado · Honduras 🇭🇳</p>
      </footer>
    </div>
  );
}
