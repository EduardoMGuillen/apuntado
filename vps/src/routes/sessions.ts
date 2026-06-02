import { Router } from "express";
import type { Server } from "socket.io";
import {
  getSession,
  startSession,
  stopSession,
  getQrCode,
  hasPersistedAuth,
} from "../services/whatsapp.js";

export function sessionRouter(io: Server) {
  const router = Router();

  router.get("/:businessId/status", async (req, res) => {
    try {
      const { businessId } = req.params;
      const ensure =
        req.query.ensure === "true" || req.query.ensure === "1";
      let session = getSession(businessId);
      const persisted = hasPersistedAuth(businessId);

      if (ensure && !session?.connected && persisted && !getQrCode(businessId)) {
        if (!session) {
          console.log(`[sessions] Auto-restore ${businessId} (auth en disco)`);
          await startSession(businessId, io, { forceQr: false });
          session = getSession(businessId);
        }
      }

      res.json({
        businessId,
        connected: session?.connected ?? false,
        hasQr: !!getQrCode(businessId),
        hasPersistedAuth: persisted,
        sessionActive: !!session,
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.get("/:businessId/qr", (req, res) => {
    const qr = getQrCode(req.params.businessId);
    if (!qr) {
      res.status(404).json({ error: "QR no disponible" });
      return;
    }
    res.json({ qr });
  });

  router.post("/:businessId/start", async (req, res) => {
    try {
      const { businessId } = req.params;
      const forceQr =
        req.query.forceQr === "true" ||
        (req.body &&
          typeof req.body === "object" &&
          (req.body as { forceQr?: boolean }).forceQr === true);

      console.log(`[sessions] POST /start businessId=${businessId} forceQr=${forceQr}`);

      await startSession(businessId, io, { forceQr });

      const qr = getQrCode(businessId);
      console.log(`[sessions] start done businessId=${businessId} hasQr=${!!qr}`);
      res.json({
        ok: true,
        qr: qr ?? undefined,
        hasQr: !!qr,
        message: qr
          ? undefined
          : "Sesión iniciada. El QR aparecerá en unos segundos.",
      });
    } catch (error) {
      console.error("[sessions/start]", error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Error al iniciar sesión",
      });
    }
  });

  router.post("/:businessId/stop", async (req, res) => {
    try {
      await stopSession(req.params.businessId);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}
