import { NextRequest, NextResponse } from "next/server";
import { getWhatsappQr } from "@/lib/vps";
import { requireBusinessApiAccess } from "@/lib/api-business-guard";

export const maxDuration = 15;

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
