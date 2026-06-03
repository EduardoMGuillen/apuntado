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

  const oauth2 = new google.auth.OAuth2(config.clientId, config.clientSecret);

  const refreshToken = decryptSecret(conn.refreshTokenEnc);
  let accessToken = conn.accessTokenEnc
    ? decryptSecret(conn.accessTokenEnc)
    : undefined;

  const expiresAt = conn.tokenExpiresAt?.getTime() ?? 0;
  const needsRefresh = !accessToken || Date.now() > expiresAt - 60_000;

  if (needsRefresh) {
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
