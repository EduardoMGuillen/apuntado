import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getSession } from "@/lib/session";
import { verifyBusinessAccess } from "@/lib/business-access";

type GuardResult =
  | { session: Session; business: NonNullable<Awaited<ReturnType<typeof verifyBusinessAccess>>>; response: null }
  | { session: Session | null; business: null; response: NextResponse };

export async function requireBusinessApiAccess(
  businessId: string
): Promise<GuardResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return {
      session: null,
      business: null,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const business = await verifyBusinessAccess(
    businessId,
    session.user.id,
    session.user.role
  );

  if (!business) {
    return {
      session,
      business: null,
      response: NextResponse.json(
        { error: "Negocio no encontrado" },
        { status: 404 }
      ),
    };
  }

  return { session, business, response: null };
}
