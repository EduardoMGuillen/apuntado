import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/token-crypto";
import { getGoogleOAuthClientConfig } from "./config";

export async function getCalendarConnection(businessId: string) {
  return prisma.googleCalendarConnection.findUnique({
    where: { businessId },
  });
}

export async function getOAuth2ClientForBusiness(businessId: string) {
  const config = getGoogleOAuthClientConfig();
  if (!config) return null;

  const conn = await getCalendarConnection(businessId);
  if (!conn) return null;

  let refreshToken: string;
  let accessToken: string | undefined;
  try {
    refreshToken = decryptSecret(conn.refreshTokenEnc);
    accessToken = conn.accessTokenEnc
      ? decryptSecret(conn.accessTokenEnc)
      : undefined;
  } catch (err) {
    console.error(
      `[GoogleCalendar] No se pudo descifrar tokens (${businessId}):`,
      err
    );
    return null;
  }

  const oauth2 = new google.auth.OAuth2(config.clientId, config.clientSecret);
  const expiresAt = conn.tokenExpiresAt?.getTime() ?? 0;
  const needsRefresh = !accessToken || Date.now() > expiresAt - 60_000;

  if (needsRefresh) {
    try {
      oauth2.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2.refreshAccessToken();
      accessToken = credentials.access_token ?? undefined;
      const expiry = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3500 * 1000);

      await prisma.googleCalendarConnection.update({
        where: { businessId },
        data: {
          accessTokenEnc: accessToken ? encryptSecret(accessToken) : null,
          tokenExpiresAt: expiry,
        },
      });
    } catch (err) {
      console.error(
        `[GoogleCalendar] Error refrescando token (${businessId}):`,
        err
      );
      return null;
    }
  }

  oauth2.setCredentials({
    refresh_token: refreshToken,
    access_token: accessToken,
  });

  return { oauth2, connection: conn };
}

export async function getCalendarApi(businessId: string) {
  const auth = await getOAuth2ClientForBusiness(businessId);
  if (!auth) return null;
  return {
    calendar: google.calendar({ version: "v3", auth: auth.oauth2 }),
    connection: auth.connection,
  };
}
