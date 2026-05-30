import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendInstance) resendInstance = new Resend(key);
  return resendInstance;
}

const FROM =
  process.env.RESEND_FROM_EMAIL || "Apuntado <onboarding@resend.dev>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY no configurada, email omitido");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error("[Resend]", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Resend]", err);
    return false;
  }
}

export function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f4faf9;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #d1e7e4;">
    <div style="margin-bottom:24px;">
      <strong style="color:#137a72;font-size:20px;">Apuntado</strong>
    </div>
    ${content}
    <p style="margin-top:32px;font-size:12px;color:#888;">
      Apuntado · Citas por WhatsApp · Honduras
    </p>
  </div>
</body>
</html>`;
}

export async function sendWelcomeEmail(to: string, name: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject: "¡Bienvenido a Apuntado!",
    html: emailLayout(`
      <h1 style="color:#137a72;margin:0 0 16px;">¡Hola, ${name}!</h1>
      <p>Tu cuenta está lista. En los próximos minutos podés:</p>
      <ol style="line-height:1.8;">
        <li>Registrar tu negocio</li>
        <li>Conectar WhatsApp con el código QR</li>
        <li>Empezar a recibir citas automáticamente</li>
      </ol>
      <p>Tenés <strong>14 días de prueba gratis</strong>.</p>
      <a href="${appUrl}/onboarding" style="display:inline-block;margin-top:16px;background:#137a72;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Configurar mi negocio
      </a>
    `),
  });
}

export async function sendNewAppointmentEmail(params: {
  to: string;
  businessName: string;
  customerPhone: string;
  customerName: string | null;
  serviceName: string;
  scheduledAt: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const cliente = params.customerName || params.customerPhone;
  return sendEmail({
    to: params.to,
    subject: `Nueva cita en ${params.businessName}`,
    html: emailLayout(`
      <h1 style="color:#137a72;margin:0 0 16px;">Nueva cita confirmada</h1>
      <p><strong>${cliente}</strong> agendó:</p>
      <ul style="line-height:1.8;">
        <li><strong>Servicio:</strong> ${params.serviceName}</li>
        <li><strong>Fecha:</strong> ${params.scheduledAt}</li>
        <li><strong>Teléfono:</strong> ${params.customerPhone}</li>
      </ul>
      <a href="${appUrl}/app" style="display:inline-block;margin-top:16px;background:#59c38b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Ver en el panel
      </a>
    `),
  });
}

export async function sendTrialEndingEmail(params: {
  to: string;
  name: string;
  businessName: string;
  daysLeft: number;
  businessId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendEmail({
    to: params.to,
    subject: `Tu prueba de Apuntado termina en ${params.daysLeft} días`,
    html: emailLayout(`
      <h1 style="color:#137a72;margin:0 0 16px;">Hola, ${params.name}</h1>
      <p>La prueba gratis de <strong>${params.businessName}</strong> termina en <strong>${params.daysLeft} días</strong>.</p>
      <p>Suscribite para que el bot siga respondiendo y agendando citas por WhatsApp.</p>
      <a href="${appUrl}/app/${params.businessId}/suscripcion" style="display:inline-block;margin-top:16px;background:#137a72;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Elegir plan
      </a>
    `),
  });
}

export async function sendSubscriptionActiveEmail(params: {
  to: string;
  name: string;
  planName: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendEmail({
    to: params.to,
    subject: "¡Suscripción activa en Apuntado!",
    html: emailLayout(`
      <h1 style="color:#137a72;margin:0 0 16px;">¡Gracias, ${params.name}!</h1>
      <p>Tu plan <strong>${params.planName}</strong> está activo. El bot de WhatsApp sigue funcionando sin interrupciones.</p>
      <a href="${appUrl}/app" style="display:inline-block;margin-top:16px;background:#137a72;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Ir al panel
      </a>
    `),
  });
}
