import type { SubscriptionAccess } from "@/lib/subscription";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];

export function getGoogleOAuthClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}

/** Básico, Pro y prueba activa pueden usar Google Calendar. */
export function canUseGoogleCalendar(access: SubscriptionAccess): boolean {
  if (!access.active) return false;
  return (
    access.plan === "basic" ||
    access.plan === "pro" ||
    access.reason === "trial"
  );
}

export function getGoogleCalendarRedirectUri(): string {
  const base = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "")
    .replace(/\/$/, "");
  return `${base}/api/google-calendar/callback`;
}
