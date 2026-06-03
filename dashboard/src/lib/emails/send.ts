import { Resend } from "resend";
import {
  newAppointmentEmailHtml,
  passwordChangedEmailHtml,
  passwordResetEmailHtml,
  subscriptionActiveEmailHtml,
  trialEndingEmailHtml,
  welcomeEmailHtml,
} from "./templates";

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendInstance) resendInstance = new Resend(key);
  return resendInstance;
}

const FROM =
  process.env.RESEND_FROM_EMAIL || "Apuntado <onboarding@resend.dev>";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY no configurada, email omitido");
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
      console.error("[Email]", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email]", err);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: "¡Bienvenido a Apuntado!",
    html: welcomeEmailHtml(name, appUrl()),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
) {
  const resetUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to,
    subject: "Restablecer tu contraseña — Apuntado",
    html: passwordResetEmailHtml(name, resetUrl),
  });
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: "Tu contraseña fue actualizada — Apuntado",
    html: passwordChangedEmailHtml(name, appUrl()),
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
  return sendEmail({
    to: params.to,
    subject: `Nueva cita en ${params.businessName}`,
    html: newAppointmentEmailHtml({ ...params, appUrl: appUrl() }),
  });
}

export async function sendTrialEndingEmail(params: {
  to: string;
  name: string;
  businessName: string;
  daysLeft: number;
  businessId: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `Tu prueba de Apuntado termina en ${params.daysLeft} días`,
    html: trialEndingEmailHtml({ ...params, appUrl: appUrl() }),
  });
}

export async function sendSubscriptionActiveEmail(params: {
  to: string;
  name: string;
  planName: string;
}) {
  return sendEmail({
    to: params.to,
    subject: "¡Suscripción activa en Apuntado!",
    html: subscriptionActiveEmailHtml({ ...params, appUrl: appUrl() }),
  });
}

export async function sendUsageAlertEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  return sendEmail(params);
}
