const VPS_URL = process.env.VPS_URL || "http://localhost:3001";
const VPS_SECRET = process.env.VPS_SECRET || "";

async function vpsFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${VPS_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-vps-secret": VPS_SECRET,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      /* raw text */
    }
    if (res.status === 401) {
      throw new Error("VPS_SECRET no coincide entre Vercel y Fly.");
    }
    throw new Error(message || `VPS error ${res.status}`);
  }

  return res.json();
}

export async function startWhatsappSession(
  businessId: string,
  options?: { forceQr?: boolean }
) {
  return vpsFetch(`/api/sessions/${businessId}/start`, {
    method: "POST",
    body: JSON.stringify({ forceQr: options?.forceQr !== false }),
  });
}

export async function stopWhatsappSession(businessId: string) {
  return vpsFetch(`/api/sessions/${businessId}/stop`, { method: "POST" });
}

export async function getWhatsappStatus(businessId: string) {
  return vpsFetch(`/api/sessions/${businessId}/status`);
}

export async function getWhatsappQr(businessId: string) {
  return vpsFetch(`/api/sessions/${businessId}/qr`);
}

export async function sendWhatsappMessage(
  businessId: string,
  customerPhone: string,
  body: string,
  replyJid?: string
) {
  return vpsFetch("/api/messages/send", {
    method: "POST",
    body: JSON.stringify({ businessId, customerPhone, body, replyJid }),
  });
}
