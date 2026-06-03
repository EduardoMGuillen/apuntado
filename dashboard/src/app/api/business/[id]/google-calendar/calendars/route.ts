import { NextResponse } from "next/server";
import { requireBusinessApiAccess } from "@/lib/api-business-guard";
import { getCalendarApi } from "@/lib/google-calendar/client";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

  const api = await getCalendarApi(params.id);
  if (!api) {
    return NextResponse.json({ error: "Conectá Google Calendar primero" }, { status: 400 });
  }

  try {
    const res = await api.calendar.calendarList.list({
      minAccessRole: "writer",
      showHidden: false,
    });
    const items = (res.data.items ?? []).map((c) => ({
      id: c.id!,
      summary: c.summary ?? c.id!,
      primary: !!c.primary,
      backgroundColor: c.backgroundColor,
    }));
    return NextResponse.json({ calendars: items });
  } catch (err) {
    console.error("[GoogleCalendar] calendarList:", err);
    return NextResponse.json(
      { error: "No se pudo listar calendarios" },
      { status: 500 }
    );
  }
}
