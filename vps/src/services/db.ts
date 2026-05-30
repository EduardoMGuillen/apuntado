const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000";
const VPS_SECRET = process.env.VPS_SECRET || "";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${DASHBOARD_URL}/api/internal${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-vps-secret": VPS_SECRET,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export interface BusinessContext {
  id: string;
  name: string;
  type: string;
  phone: string;
  city: string;
  manualTakeover: boolean;
  takenOverAt: string | null;
  subscriptionActive: boolean;
  systemPrompt: string;
  availability: string;
}

export interface MessageRecord {
  body: string;
  fromClient: boolean;
  createdAt: string;
}

export async function getBusinessContext(
  businessId: string,
  customerPhone: string
): Promise<BusinessContext> {
  return apiFetch(`/business/${businessId}/context?phone=${encodeURIComponent(customerPhone)}`);
}

export async function getMessageHistory(
  businessId: string,
  customerPhone: string
): Promise<MessageRecord[]> {
  return apiFetch(
    `/messages/${businessId}?phone=${encodeURIComponent(customerPhone)}&limit=4`
  );
}

export async function saveIncomingMessage(
  businessId: string,
  customerPhone: string,
  body: string
): Promise<void> {
  await apiFetch("/messages", {
    method: "POST",
    body: JSON.stringify({ businessId, customerPhone, body, fromClient: true }),
  });
}

export async function saveOutgoingMessage(
  businessId: string,
  customerPhone: string,
  body: string
): Promise<void> {
  await apiFetch("/messages", {
    method: "POST",
    body: JSON.stringify({ businessId, customerPhone, body, fromClient: false }),
  });
}

export async function createAppointmentFromBot(data: {
  businessId: string;
  customerPhone: string;
  serviceName: string;
  scheduledAt: string;
  employeeName?: string;
}): Promise<void> {
  await apiFetch("/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function setSessionConnected(
  businessId: string,
  connected: boolean
): Promise<void> {
  await apiFetch(`/sessions/${businessId}`, {
    method: "PATCH",
    body: JSON.stringify({ connected }),
  });
}

export async function getExpiredTakeovers(): Promise<
  { businessId: string; customerPhone: string }[]
> {
  return apiFetch("/takeover/expired");
}

export async function releaseTakeover(
  businessId: string,
  customerPhone: string
): Promise<void> {
  await apiFetch("/takeover/release", {
    method: "POST",
    body: JSON.stringify({ businessId, customerPhone }),
  });
}

export async function getAppointmentsForReminder(): Promise<
  {
    businessId: string;
    customerPhone: string;
    customerName: string | null;
    businessName: string;
    scheduledAt: string;
    serviceName: string;
  }[]
> {
  return apiFetch("/reminders/pending");
}
