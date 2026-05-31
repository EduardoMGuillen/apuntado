import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBusinessForSession } from "@/lib/business-access";
import { DashboardShell } from "@/components/dashboard/shell";
import { PersonalizationForm } from "@/components/dashboard/personalization-form";
import {
  DEFAULT_WELCOME_OPTIONS,
  parseWelcomeMenuOptions,
} from "@/lib/welcome-menu";
import { mergeSchedules } from "@/lib/schedule-defaults";
import type { BookingMode } from "@/lib/booking-modes";
import { parseConversationTone } from "@/lib/conversation-tones";

export default async function PersonalizacionPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const business = await getBusinessForSession(session, params.id, {
    whatsappSession: true,
    subscription: true,
    settings: true,
    services: { where: { isActive: true }, orderBy: { name: "asc" } },
    schedules: { orderBy: { dayOfWeek: "asc" } },
  });

  if (!business) redirect("/app");

  const bookingMode = (business.settings?.bookingMode ??
    "services") as BookingMode;
  const storedWelcome = parseWelcomeMenuOptions(
    business.settings?.welcomeMenuOptions
  );

  return (
    <DashboardShell business={business}>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Personalización</h1>
        <p className="text-muted-foreground">
          Negocio, modo del bot, tono, catálogo, horarios y menú de bienvenida en
          WhatsApp.
        </p>
      </div>

      <div className="mt-6">
        <PersonalizationForm
          businessId={business.id}
          initial={{
            name: business.name,
            type: business.type,
            phone: business.phone,
            city: business.city,
            address: business.address,
            bookingMode,
            conversationTone: parseConversationTone(
              business.settings?.conversationTone
            ),
            welcomeMenuGreeting: business.settings?.welcomeMenuGreeting ?? null,
            welcomeMenuOptions:
              storedWelcome.length >= 2
                ? storedWelcome
                : [...DEFAULT_WELCOME_OPTIONS[bookingMode]],
            offerings: business.services.map((s) => ({
              id: s.id,
              name: s.name,
              durationMin: s.durationMin,
              priceHNL: parseFloat(s.priceHNL.toString()),
            })),
            schedules: mergeSchedules(business.schedules),
          }}
        />
      </div>
    </DashboardShell>
  );
}
