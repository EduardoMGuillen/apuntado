import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isSuperAdminRole } from "@/lib/roles";
import { getAdminUsageOverview } from "@/lib/plan-usage";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || !isSuperAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rows = await getAdminUsageOverview();
  const summary = {
    businesses: rows.length,
    atRisk: rows.filter((r) => r.atRisk).length,
    atLimit: rows.filter((r) => r.atLimit).length,
    totalAiCalls: rows.reduce((s, r) => s + r.aiCallsUsed, 0),
    totalConversations: rows.reduce((s, r) => s + r.conversationsUsed, 0),
  };

  return NextResponse.json({ summary, rows });
}
