const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CHARS = 6000;

const cache = new Map<string, { text: string; fetchedAt: number }>();

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function fetchWebsiteContent(
  rawUrl: string | null | undefined
): Promise<{ url: string; text: string } | null> {
  const url = rawUrl ? normalizeUrl(rawUrl) : null;
  if (!url) return null;

  const cached = cache.get(url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { url, text: cached.text };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ApuntadoBot/1.0 (+https://apuntado.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });

    if (!res.ok) return null;

    const html = await res.text();
    const text = htmlToText(html).slice(0, MAX_CHARS);
    if (!text) return null;

    cache.set(url, { text, fetchedAt: Date.now() });
    return { url, text };
  } catch {
    return null;
  }
}

export function buildWebsiteContextSection(
  content: { url: string; text: string } | null
): string {
  if (!content) return "";

  return `
CONTENIDO_WEB (fuente actualizada — usala para eventos, promos, carta extendida e info del negocio):
URL: ${content.url}
---
${content.text}
---
- Si el cliente pregunta por eventos, promos o algo que aparezca aquí, basate en este texto.
- No inventés fechas, precios ni eventos que no estén en CONTENIDO_WEB o en el catálogo cargado.
- Resumí en tono WhatsApp; no pegues bloques enormes.`;
}
