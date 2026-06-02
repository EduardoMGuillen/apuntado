import webpush from "web-push";
import { prisma } from "@/lib/prisma";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let configured = false;
let enabled = false;

function ensureConfigured(): boolean {
  if (configured) return enabled;
  configured = true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:soporte@apuntado.app";

  if (!publicKey || !privateKey) {
    enabled = false;
    console.warn("[Push] VAPID no configurado; notificaciones web desactivadas");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  enabled = true;
  return true;
}

async function sendToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  if (!ensureConfigured()) return;
  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    },
    JSON.stringify(payload)
  );
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { endpoint: true, p256dh: true, auth: true },
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await sendToSubscription(sub, payload);
      } catch (error) {
        const status = (error as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: sub.endpoint },
          });
          return;
        }
        console.error("[Push] Error enviando push:", error);
      }
    })
  );
}

export async function sendPushToBusinessOwner(
  businessId: string,
  payload: PushPayload
) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true },
  });
  if (!business?.ownerId) return;
  await sendPushToUser(business.ownerId, payload);
}
