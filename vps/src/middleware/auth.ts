import type { Request, Response, NextFunction } from "express";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret = req.headers["x-vps-secret"];
  if (!secret || secret !== process.env.VPS_SECRET) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
}
