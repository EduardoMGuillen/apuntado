import cron from "node-cron";
import { getExpiredTakeovers, releaseTakeover } from "../services/db.js";

/** Libera control manual tras 4 días sin mensajes en el chat (ver dashboard manual-takeover-idle). */
export function startTakeoverTimeoutJob(): void {
  cron.schedule("0 */6 * * *", async () => {
    try {
      const expired = await getExpiredTakeovers();
      for (const item of expired) {
        await releaseTakeover(item.businessId, item.customerPhone);
        console.log(
          `[Takeover] Bot retomó tras inactividad (4d): ${item.businessId} / ${item.customerPhone}`
        );
      }
    } catch (err) {
      console.error("[Takeover] Error en job de timeout:", err);
    }
  });
}
