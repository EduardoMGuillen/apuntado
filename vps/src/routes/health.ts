import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "apuntado-vps",
    timestamp: new Date().toISOString(),
    timezone: "America/Tegucigalpa",
  });
});
