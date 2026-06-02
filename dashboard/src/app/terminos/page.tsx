import Link from "next/link";

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Términos y condiciones</h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: {new Date().toLocaleDateString("es-HN")}
        </p>

        <section className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            Al usar Apuntado, aceptás estos términos. El servicio facilita la
            gestión de conversaciones, reservas y automatizaciones por WhatsApp
            para negocios en Centroamérica.
          </p>
          <p>
            Cada usuario es responsable de la configuración de su cuenta, sus
            reglas del bot, su contenido, y del cumplimiento de las políticas de
            WhatsApp y de la normativa aplicable en su país.
          </p>
          <p>
            Apuntado y Nexus Global no se hacen responsables por pérdida de
            datos, bloqueos, limitaciones, suspensiones, cierres de cuenta,
            infracciones o sanciones relacionadas con cuentas de WhatsApp cuando
            dichas situaciones deriven de la configuración, uso, operación o
            decisiones del usuario dentro de la plataforma.
          </p>
          <p>
            Nos reservamos el derecho de actualizar estos términos para mejorar
            el servicio, por cambios legales o por razones de seguridad.
          </p>
        </section>

        <div className="pt-2">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
