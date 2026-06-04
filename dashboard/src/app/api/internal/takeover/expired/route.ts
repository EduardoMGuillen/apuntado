import { NextResponse } from "next/server";
import { withVpsAuth } from "@/lib/internal-api";

/** Auto-liberación deshabilitada: el bot solo retoma con «Devolver al bot» en el panel. */
export const GET = withVpsAuth(async () => {
  return NextResponse.json([]);
});
