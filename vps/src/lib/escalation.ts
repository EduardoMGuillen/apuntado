export function stripEscalationKeyword(response: string): {
  clean: string;
  escalate: boolean;
  reason?: string;
} {
  if (!response.includes("ESCALAR_AGENTE")) {
    return { clean: response, escalate: false };
  }

  let reason: string | undefined;

  for (const line of response.split("\n")) {
    if (line.startsWith("ESCALAR_DATA:")) {
      try {
        const data = JSON.parse(line.replace("ESCALAR_DATA:", "")) as {
          reason?: string;
        };
        reason = data.reason?.trim() || undefined;
      } catch {
        /* ignore */
      }
    }
  }

  const clean = response
    .replace(/ESCALAR_AGENTE/g, "")
    .replace(/ESCALAR_DATA:.*\n?/g, "")
    .trim();

  return { clean, escalate: true, reason };
}
