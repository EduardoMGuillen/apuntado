const TYPES = [
  { emoji: "💇", name: "Salones" },
  { emoji: "✂️", name: "Barberías" },
  { emoji: "🦷", name: "Dentistas" },
  { emoji: "🏥", name: "Clínicas" },
  { emoji: "🔧", name: "Mecánicas" },
  { emoji: "💅", name: "Uñas & spa" },
];

export function LandingBusinessTypes() {
  return (
    <section className="border-y border-border/60 bg-secondary/30 py-20">
      <div className="container mx-auto px-4 text-center lg:px-8">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          Hecho para negocios como el tuyo
        </h2>
        <p className="mt-3 text-muted-foreground">
          Si tus clientes ya te escriben por WhatsApp, Apuntado es para vos.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {TYPES.map(({ emoji, name }) => (
            <span
              key={name}
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-5 py-2.5 text-sm font-medium shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <span className="text-lg">{emoji}</span>
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
