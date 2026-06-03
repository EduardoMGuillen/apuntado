import type { Appointment, Customer, Service } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { reconcileCustomerPhone } from "@/lib/customer-phone";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import { getStartOfBusinessDayUtc } from "@/lib/business-datetime";
export function buildPhoneVariants(rawPhone: string): string[] {
  const normalized = normalizeWhatsAppPhone(rawPhone);
  const variants = new Set<string>([rawPhone.trim(), normalized]);
  const digits = normalized.replace(/\D/g, "");
  if (digits.length >= 8) variants.add(`+${digits}`);
  if (digits.startsWith("504") && digits.length >= 11) {
    variants.add(digits.slice(3));
  }
  return Array.from(variants);
}

export async function resolveCustomerForContext(
  businessId: string,
  rawPhone: string,
  timezone: string
): Promise<{
  customer: Customer | null;
  appointments: (Appointment & { service: Service; customer: Customer })[];
}> {
  const canonicalPhone = await reconcileCustomerPhone(businessId, rawPhone);
  const variants = [...buildPhoneVariants(canonicalPhone)];
  if (rawPhone.trim() !== canonicalPhone) {
    variants.push(...buildPhoneVariants(rawPhone));
  }
  const uniqueVariants = Array.from(new Set(variants));

  const customers = await prisma.customer.findMany({
    where: {
      businessId,
      whatsappPhone: { in: uniqueVariants },
    },
  });

  const customerIds = customers.map((c) => c.id);
  const rangeStart = getStartOfBusinessDayUtc(timezone);

  const appointments =
    customerIds.length > 0
      ? await prisma.appointment.findMany({
          where: {
            businessId,
            customerId: { in: customerIds },
            scheduledAt: { gte: rangeStart },
            status: { in: ["pending", "confirmed"] },
          },
          include: { service: true, customer: true },
          orderBy: { scheduledAt: "asc" },
          take: 10,
        })
      : [];

  let customer: Customer | null = null;
  if (customers.length === 1) {
    customer = customers[0]!;
  } else if (customers.length > 1) {
    customer =
      customers.find((c) => c.name?.trim()) ??
      appointments[0]?.customer ??
      customers[0] ??
      null;
  }

  if (customer && !customer.name?.trim()) {
    const named = customers.find((c) => c.name?.trim());
    if (named) {
      customer = { ...customer, name: named.name, clientType: named.clientType };
    }
  }

  return { customer, appointments };
}

export function buildCustomerAppointmentsPromptSection(
  appointments: (Appointment & { service: Service; customer: Customer })[],
  timezone: string,
  customer: Customer | null
): string {
  const name =
    customer?.name?.trim() ||
    appointments[0]?.customer.name?.trim() ||
    "no registrado en sistema";

  if (appointments.length === 0) {
    return `CITAS DE ESTE CLIENTE (WhatsApp actual):
- No hay citas futuras confirmadas vinculadas a este chat.
- Si el cliente pregunta por una cita que acaba de agendar en esta conversación y aún no aparece aquí, confirmá según lo acordado en el chat; si no hay registro, ofrecé verificar con el negocio.`;
  }

  const lines = appointments.map((apt) => {
    const when = formatInTimeZone(
      apt.scheduledAt,
      timezone,
      "EEEE d 'de' MMMM yyyy · h:mm a",
      { locale: es }
    );
    const aptName = apt.customer.name?.trim() || name;
    return `- ${apt.service.name} · ${when} · a nombre de: ${aptName} · estado: ${apt.status}`;
  });

  return `CITAS DE ESTE CLIENTE (WhatsApp actual — usar esta sección cuando pregunte "mi cita", "a qué hora", "cuándo es"):
- Nombre registrado: ${name}
- Citas futuras:
${lines.join("\n")}
- Si pregunta por su cita, respondá con la fecha y hora de arriba. NO diga que no hay en sistema si aparece listada.
- Si hay varias, pregunte cuál o resuma todas.`;
}
