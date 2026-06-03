import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/token-crypto";
import {
  getGoogleCalendarRedirectUri,
  getGoogleOAuthClientConfig,
  GOOGLE_CALENDAR_SCOPES,
} from "./config";
import { backfillAppointmentsToGoogle } from "./sync";

export function buildGoogleCalendarAuthUrl(state: string): string | null {
  const config = getGoogleOAuthClientConfig();
  if (!config) return null;

  const oauth2 = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    getGoogleCalendarRedirectUri()
  );

  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCodeAndStoreConnection(params: {
  businessId: string;
  code: string;
}): Promise<{ email: string | null }> {
  const config = getGoogleOAuthClientConfig();
  if (!config) throw new Error("Google OAuth no configurado");

  const oauth2 = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    getGoogleCalendarRedirectUri()
  );

  const { tokens } = await oauth2.getToken(params.code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google no devolvió refresh token. Revocá el acceso en tu cuenta Google y conectá de nuevo."
    );
  }

  oauth2.setCredentials(tokens);
  const oauth2User = google.oauth2({ version: "v2", auth: oauth2 });
  const me = await oauth2User.userinfo.get();
  const email = me.data.email ?? null;

  const refreshEnc = encryptSecret(tokens.refresh_token);
  const accessEnc = tokens.access_token
    ? encryptSecret(tokens.access_token)
    : null;
  const expiry = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3500 * 1000);

  await prisma.googleCalendarConnection.upsert({
    where: { businessId: params.businessId },
    create: {
      businessId: params.businessId,
      googleEmail: email,
      refreshTokenEnc: refreshEnc,
      accessTokenEnc: accessEnc,
      tokenExpiresAt: expiry,
      calendarId: "primary",
      calendarSummary: "Principal",
    },
    update: {
      googleEmail: email,
      refreshTokenEnc: refreshEnc,
      accessTokenEnc: accessEnc,
      tokenExpiresAt: expiry,
      busyCacheJson: null,
      busyCacheExpiresAt: null,
    },
  });

  backfillAppointmentsToGoogle(params.businessId).catch(console.error);

  return { email };
}

export async function revokeGoogleConnection(businessId: string) {
  const conn = await prisma.googleCalendarConnection.findUnique({
    where: { businessId },
  });
  if (!conn) return;

  try {
    const config = getGoogleOAuthClientConfig();
    if (config) {
      const token = decryptSecret(conn.refreshTokenEnc);
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
      });
    }
  } catch (err) {
    console.error("[GoogleCalendar] revoke failed:", err);
  }

  await prisma.googleCalendarConnection.delete({
    where: { businessId },
  });
}
