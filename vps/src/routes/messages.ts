import { Router } from "express";
import { sendMessage } from "../services/whatsapp.js";

export const messageRouter = Router();

messageRouter.post("/send", async (req, res) => {
  const { businessId, customerPhone, body } = req.body as {
    businessId?: string;
    customerPhone?: string;
    body?: string;
  };

  if (!businessId || !customerPhone || !body) {
    res.status(400).json({ error: "businessId, customerPhone y body son requeridos" });
    return;
  }

  try {
    await sendMessage(businessId, customerPhone, body);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
