export function getCorsOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "https://apuntado.app",
    "https://www.apuntado.app",
  ]);

  const dashboard = process.env.DASHBOARD_URL?.trim();
  if (dashboard) {
    origins.add(dashboard.replace(/\/$/, ""));
  }

  const extra = process.env.CORS_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (extra) {
    for (const o of extra) {
      origins.add(o.replace(/\/$/, ""));
    }
  }

  return [...origins];
}
