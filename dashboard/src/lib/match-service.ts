import type { Service } from "@prisma/client";

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Busca servicio por nombre exacto o aproximado (evita fallos del bot por mayúsculas/typos). */
export function matchServiceByName(
  services: Service[],
  requestedName: string
): Service | null {
  const active = services.filter((s) => s.isActive);
  if (!active.length) return null;

  const target = normalizeName(requestedName);
  if (!target) return null;

  const exact = active.find((s) => normalizeName(s.name) === target);
  if (exact) return exact;

  const contains = active.find((s) => {
    const n = normalizeName(s.name);
    return n.includes(target) || target.includes(n);
  });
  if (contains) return contains;

  const targetWords = target.split(/\s+/).filter((w) => w.length > 2);
  if (targetWords.length === 0) return null;

  let best: Service | null = null;
  let bestScore = 0;

  for (const service of active) {
    const words = normalizeName(service.name).split(/\s+/);
    const score = targetWords.filter((tw) =>
      words.some((w) => w.includes(tw) || tw.includes(w))
    ).length;
    if (score > bestScore) {
      bestScore = score;
      best = service;
    }
  }

  return bestScore >= Math.min(2, targetWords.length) ? best : null;
}
