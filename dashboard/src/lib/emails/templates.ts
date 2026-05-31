function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f4faf9;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #d1e7e4;">
    <div style="margin-bottom:24px;">
      <strong style="color:#137a72;font-size:20px;">Apuntado</strong>
    </div>
    ${content}
    <p style="margin-top:32px;font-size:12px;color:#888;line-height:1.5;">
      Apuntado · Citas por WhatsApp · Centroamérica<br>
      Si no solicitaste este correo, podés ignorarlo.
    </p>
  </div>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;background:#137a72;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(label)}</a>`;
}

export function welcomeEmailHtml(name: string, appUrl: string): string {
  const safeName = escapeHtml(name);
  return emailLayout(`
    <h1 style="color:#137a72;margin:0 0 16px;font-size:22px;">¡Hola, ${safeName}!</h1>
    <p style="color:#334155;line-height:1.6;margin:0 0 12px;">Tu cuenta en Apuntado está lista. En pocos minutos podés:</p>
    <ol style="color:#334155;line-height:1.8;margin:0 0 16px;padding-left:20px;">
      <li>Registrar tu negocio</li>
      <li>Conectar WhatsApp con el código QR</li>
      <li>Recibir citas automáticamente</li>
    </ol>
    <p style="color:#334155;line-height:1.6;margin:0;">Tenés <strong>14 días de prueba gratis</strong>.</p>
    ${button(`${appUrl}/onboarding`, "Configurar mi negocio")}
  `);
}

export function passwordResetEmailHtml(name: string, resetUrl: string): string {
  const safeName = escapeHtml(name);
  return emailLayout(`
    <h1 style="color:#137a72;margin:0 0 16px;font-size:22px;">Restablecer contraseña</h1>
    <p style="color:#334155;line-height:1.6;margin:0 0 12px;">Hola ${safeName}, recibimos una solicitud para cambiar la contraseña de tu cuenta.</p>
    <p style="color:#334155;line-height:1.6;margin:0;">El enlace expira en <strong>1 hora</strong>.</p>
    ${button(resetUrl, "Crear nueva contraseña")}
    <p style="color:#64748b;font-size:13px;line-height:1.5;margin-top:24px;">Si no fuiste vos, ignorá este correo. Tu contraseña actual sigue igual.</p>
  `);
}

export function passwordChangedEmailHtml(name: string, appUrl: string): string {
  const safeName = escapeHtml(name);
  return emailLayout(`
    <h1 style="color:#137a72;margin:0 0 16px;font-size:22px;">Contraseña actualizada</h1>
    <p style="color:#334155;line-height:1.6;margin:0 0 12px;">Hola ${safeName}, tu contraseña de Apuntado se cambió correctamente.</p>
    <p style="color:#334155;line-height:1.6;margin:0;">Si no reconocés este cambio, contactanos de inmediato.</p>
    ${button(`${appUrl}/login`, "Iniciar sesión")}
  `);
}

export function newAppointmentEmailHtml(params: {
  businessName: string;
  customerPhone: string;
  customerName: string | null;
  serviceName: string;
  scheduledAt: string;
  appUrl: string;
}): string {
  const cliente = escapeHtml(params.customerName || params.customerPhone);
  return emailLayout(`
    <h1 style="color:#137a72;margin:0 0 16px;font-size:22px;">Nueva cita confirmada</h1>
    <p style="color:#334155;line-height:1.6;"><strong>${cliente}</strong> agendó en <strong>${escapeHtml(params.businessName)}</strong>:</p>
    <ul style="color:#334155;line-height:1.8;margin:16px 0;padding-left:20px;">
      <li><strong>Servicio:</strong> ${escapeHtml(params.serviceName)}</li>
      <li><strong>Fecha:</strong> ${escapeHtml(params.scheduledAt)}</li>
      <li><strong>Teléfono:</strong> ${escapeHtml(params.customerPhone)}</li>
    </ul>
    ${button(`${params.appUrl}/app`, "Ver en el panel")}
  `);
}

export function trialEndingEmailHtml(params: {
  name: string;
  businessName: string;
  daysLeft: number;
  appUrl: string;
  businessId: string;
}): string {
  return emailLayout(`
    <h1 style="color:#137a72;margin:0 0 16px;font-size:22px;">Hola, ${escapeHtml(params.name)}</h1>
    <p style="color:#334155;line-height:1.6;">La prueba gratis de <strong>${escapeHtml(params.businessName)}</strong> termina en <strong>${params.daysLeft} días</strong>.</p>
    <p style="color:#334155;line-height:1.6;">Suscribite para que el bot siga respondiendo por WhatsApp.</p>
    ${button(`${params.appUrl}/app/${params.businessId}/suscripcion`, "Elegir plan")}
  `);
}

export function subscriptionActiveEmailHtml(params: {
  name: string;
  planName: string;
  appUrl: string;
}): string {
  return emailLayout(`
    <h1 style="color:#137a72;margin:0 0 16px;font-size:22px;">¡Gracias, ${escapeHtml(params.name)}!</h1>
    <p style="color:#334155;line-height:1.6;">Tu plan <strong>${escapeHtml(params.planName)}</strong> está activo. El bot de WhatsApp sigue funcionando sin interrupciones.</p>
    ${button(`${params.appUrl}/app`, "Ir al panel")}
  `);
}
