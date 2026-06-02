import Link from "next/link";

export default function PoliticasPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Políticas de uso y privacidad</h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: {new Date().toLocaleDateString("es-HN")}
        </p>

        <section className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            Apuntado procesa datos necesarios para operar el servicio (mensajes,
            citas, contactos y configuración del negocio), con el objetivo de
            habilitar automatizaciones y gestión comercial.
          </p>
          <p>
            Cada cliente es responsable de solicitar los consentimientos que
            correspondan a sus usuarios finales y de usar la plataforma conforme
            a la legislación local de protección de datos.
          </p>
          <p>
            Apuntado y Nexus Global no garantizan la disponibilidad continua de
            servicios de terceros (incluyendo WhatsApp) y no se hacen
            responsables por pérdida de datos, infracciones, restricciones o
            suspensiones de cuentas de WhatsApp ocasionadas por la configuración
            o el uso que cada usuario haga de su bot.
          </p>
          <p>
            Aplicamos medidas razonables de seguridad; sin embargo, ningún
            sistema es infalible y el usuario mantiene responsabilidad sobre sus
            credenciales, accesos y decisiones operativas.
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
