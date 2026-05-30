import { prisma } from "@/lib/prisma";
import { normalizeWhatsAppPhone } from "@/lib/phone";

/** Unifica teléfono en DB (cliente + mensajes) y devuelve el E.164 normalizado. */
export async function reconcileCustomerPhone(
  businessId: string,
  rawPhone: string
): Promise<string> {
  const phone = normalizeWhatsAppPhone(rawPhone);

  const existing = await prisma.customer.findFirst({
    where: {
      businessId,
      OR: [
        { whatsappPhone: phone },
        ...(rawPhone !== phone ? [{ whatsappPhone: rawPhone }] : []),
      ],
    },
  });

  if (existing && existing.whatsappPhone !== phone) {
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: existing.id },
        data: { whatsappPhone: phone },
      }),
      prisma.whatsappMessage.updateMany({
        where: { businessId, customerPhone: existing.whatsappPhone },
        data: { customerPhone: phone },
      }),
    ]);
  }

  return phone;
}
