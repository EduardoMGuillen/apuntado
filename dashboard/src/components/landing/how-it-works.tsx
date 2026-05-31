const STEPS = [
  {
    step: "01",
    title: "Conectá tu WhatsApp",
    desc: "Escaneá el QR desde el panel. Tu número sigue en tu celular, sin perder el control.",
  },
  {
    step: "02",
    title: "Configurá tu negocio",
    desc: "Servicios, horarios, empleados y precios en tu moneda local. El bot aprende tu forma de trabajar.",
  },
  {
    step: "03",
    title: "Dejá que responda",
    desc: "Los clientes escriben, el bot agenda y vos ves todo en tiempo real desde el dashboard.",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="como-funciona" className="py-24 bg-muted/50">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Cómo funciona
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            En 3 pasos estás recibiendo citas
          </h2>
        </div>

        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-12 hidden h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block" />
          <div className="grid gap-10 md:grid-cols-3">
            {STEPS.map(({ step, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="relative z-10 mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-primary/20 bg-card font-display text-3xl font-bold text-primary shadow-lg">
                  {step}
                </div>
                <h3 className="mt-6 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
