import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBusinessForSession } from "@/lib/business-access";
import { DashboardShell } from "@/components/dashboard/shell";
import { RulesForm } from "@/components/dashboard/rules-form";
import { parseBotPlaybooks } from "@/lib/bot-playbooks";

export default async function ReglasPage({
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
  });

  if (!business) redirect("/app");

  const playbooks = parseBotPlaybooks(business.settings?.botPlaybooks);

  return (
    <DashboardShell business={business}>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Reglas</h1>
        <p className="text-muted-foreground">
          Instrucciones para situaciones específicas y notas para el asistente.
        </p>
      </div>

      <div className="mt-6 max-w-2xl">
        <RulesForm
          businessId={business.id}
          initial={{
            botPlaybooks:
              playbooks.length > 0 ? playbooks : [{ when: "", action: "" }],
            botInstructions: business.settings?.botInstructions ?? null,
          }}
        />
      </div>
    </DashboardShell>
  );
}
