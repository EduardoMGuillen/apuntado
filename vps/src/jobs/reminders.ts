import cron from "node-cron";
import { getAppointmentsForReminder } from "../services/db.js";
import { sendMessage } from "../services/whatsapp.js";
import { formatInTimeZone } from "date-fns-tz";

const DEFAULT_TZ = "America/Tegucigalpa";

export function startReminderJob(): void {
  cron.schedule("0 * * * *", async () => {
    try {
      const appointments = await getAppointmentsForReminder();

      for (const apt of appointments) {
        const fecha = formatInTimeZone(
          new Date(apt.scheduledAt),
          apt.timezone || DEFAULT_TZ,
          "EEEE d 'de' MMMM 'a las' h:mm a"
        );

        const nombre = apt.customerName || "cliente";
        const msg =
          apt.reminderType === "1h"
            ? `¡Hola ${nombre}! ⏰ Tu cita en *${apt.businessName}* para *${apt.serviceName}* es en aproximadamente 1 hora (${fecha}). Si necesitás moverla, escribinos ahora.`
            : `¡Hola ${nombre}! 👋 Te recordamos tu cita en *${apt.businessName}* para *${apt.serviceName}* el ${fecha}. Si necesitás cambiarla, escribinos. ¡Te esperamos!`;

        try {
          await sendMessage(
            apt.businessId,
            apt.customerPhone,
            msg,
            apt.customerReplyJid ?? undefined,
            { source: "system" }
          );
        } catch (err) {
          console.error(`[Reminder] Error enviando a ${apt.customerPhone}:`, err);
        }
      }
    } catch (err) {
      console.error("[Reminder] Error en job:", err);
    }
  });
}
