import { Router } from "express";
import type { Server } from "socket.io";
import {
  getSession,
  startSession,
  stopSession,
  getQrCode,
  waitForQr,
} from "../services/whatsapp.js";

export function sessionRouter(io: Server) {
  const router = Router();

  router.get("/:businessId/status", async (req, res) => {
    try {
      const session = getSession(req.params.businessId);
      res.json({
        businessId: req.params.businessId,
        connected: session?.connected ?? false,
        hasQr: !!getQrCode(req.params.businessId),
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
      await startSession(businessId, io);
      const qr = await waitForQr(businessId);

      if (qr) {
        res.json({ ok: true, qr });
        return;
      }

      res.json({
        ok: true,
        message: "Sesión iniciada. El QR puede tardar unos segundos.",
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
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
