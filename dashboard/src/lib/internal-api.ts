import { NextRequest, NextResponse } from "next/server";
import { verifyVpsSecret } from "@/lib/bot-prompt";

export function withVpsAuth(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const secret = req.headers.get("x-vps-secret");
    if (!verifyVpsSecret(secret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return handler(req);
  };
}
