import {
  MessageCircle,
  Calendar,
  Hand,
  Shield,
  Bell,
  Users,
  Zap,
  Clock,
} from "lucide-react";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "WhatsApp nativo",
    desc: "Tus clientes no descargan nada. Escriben al número que ya conocen.",
    className: "md:col-span-2 md:row-span-2",
    large: true,
  },
  {
    icon: Calendar,
    title: "Agenda en tiempo real",
    desc: "Consulta tu disponibilidad y confirma citas al instante.",
    className: "",
  },
  {
    icon: Hand,
    title: "Control manual",
    desc: "Tomá la conversación cuando querés y devolvésela al bot.",
    className: "",
  },
  {
    icon: Shield,
    title: "Sin spam",
    desc: "Solo respuestas a mensajes entrantes. Protegemos tu número.",
    className: "",
  },
  {
    icon: Bell,
    title: "Recordatorios 24h",
    desc: "Menos inasistencias con avisos automáticos.",
    className: "md:col-span-2",
  },
];

const MINI = [
  { icon: Users, label: "Multi-empleado" },
  { icon: Zap, label: "Respuesta rápida" },
  { icon: Clock, label: "Zona CA" },
];

export function LandingFeatures() {
  return (
    <section id="funciones" className="relative py-24 mesh-light">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Funciones
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Todo lo que tu negocio necesita para{" "}
            <span className="text-gradient">no perder citas</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Un asistente que trabaja 24/7 mientras vos atendés clientes en el local.
          </p>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc, className, large }) => (
            <div
              key={title}
              className={`group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-glow ${className}`}
            >
              <div
                className={`mb-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground ${large ? "h-14 w-14" : "h-11 w-11"}`}
              >
                <Icon className={large ? "h-7 w-7" : "h-5 w-5"} />
              </div>
              <h3 className={`font-display font-semibold ${large ? "text-xl" : ""}`}>
                {title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {desc}
              </p>
              {large && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {MINI.map(({ icon: I, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      <I className="h-3 w-3" />
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
