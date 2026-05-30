import cron from "node-cron";
import { getExpiredTakeovers, releaseTakeover } from "../services/db.js";

export function startTakeoverTimeoutJob(): void {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const expired = await getExpiredTakeovers();
      for (const item of expired) {
        await releaseTakeover(item.businessId, item.customerPhone);
        console.log(
          `[Takeover] Bot retomó conversación: ${item.businessId} / ${item.customerPhone}`
        );
      }
    } catch (err) {
      console.error("[Takeover] Error en job de timeout:", err);
    }
  });
}
