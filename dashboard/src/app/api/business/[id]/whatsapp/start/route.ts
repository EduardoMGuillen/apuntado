import { NextRequest, NextResponse } from "next/server";
import { startWhatsappSession, getWhatsappQr } from "@/lib/vps";
import { requireBusinessApiAccess } from "@/lib/api-business-guard";

export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

  try {
    const body = await req.json().catch(() => ({}));
    const forceQr =
      typeof body === "object" &&
      body !== null &&
      (body as { forceQr?: boolean }).forceQr === true;

    const data = await startWhatsappSession(params.id, { forceQr });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al iniciar sesión";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

  try {
    const data = await getWhatsappQr(params.id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "QR no disponible" }, { status: 404 });
  }
}
