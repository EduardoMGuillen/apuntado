import fs from "fs";
import path from "path";

/**
 * Borra claves E2E corruptas (session-*, sender-key-*) pero conserva creds.json.
 * Útil tras migrar Baileys 6→7 sin pedir QR de nuevo.
 */
export function cleanEncryptionSessionFiles(authPath: string): number {
  if (!fs.existsSync(authPath)) return 0;

  let deleted = 0;
  for (const file of fs.readdirSync(authPath)) {
    if (file === "creds.json") continue;
    if (
      file.startsWith("session-") ||
      file.startsWith("sender-key-") ||
      file.startsWith("app-state-sync-key-")
    ) {
      fs.unlinkSync(path.join(authPath, file));
      deleted++;
    }
  }
  return deleted;
}
