import { prisma } from "@/lib/prisma";
import { getBusinessDayRangeUtc } from "@/lib/business-datetime";
import { getCalendarApi } from "./client";

export type BusyInterval = { scheduledAt: Date; endsAt: Date };

const BUSY_CACHE_MS = 2 * 60 * 1000;

function parseBusyCache(json: string | null | undefined): BusyInterval[] {
  if (!json) return [];
  try {
    const raw = JSON.parse(json) as { start: string; end: string }[];
    return raw.map((b) => ({
      scheduledAt: new Date(b.start),
      endsAt: new Date(b.end),
    }));
  } catch {
    return [];
  }
}

export async function fetchGoogleBusyIntervals(
  businessId: string,
  timezone: string,
  dayCount = 3
): Promise<BusyInterval[]> {
  const conn = await prisma.googleCalendarConnection.findUnique({
    where: { businessId },
  });
  if (!conn) return [];

  if (
    conn.busyCacheJson &&
    conn.busyCacheExpiresAt &&
    conn.busyCacheExpiresAt.getTime() > Date.now()
  ) {
    return parseBusyCache(conn.busyCacheJson);
  }

  const api = await getCalendarApi(businessId);
  if (!api) return [];

  const { start: rangeStart, end: rangeEnd } = getBusinessDayRangeUtc(
    timezone,
    dayCount
  );

  try {
    const res = await api.calendar.freebusy.query({
      requestBody: {
        timeMin: rangeStart.toISOString(),
        timeMax: rangeEnd.toISOString(),
        timeZone: timezone,
        items: [{ id: conn.calendarId }],
      },
    });

    const calBusy =
      res.data.calendars?.[conn.calendarId]?.busy ?? [];
    const intervals: BusyInterval[] = calBusy
      .filter((b) => b.start && b.end)
      .map((b) => ({
        scheduledAt: new Date(b.start!),
        endsAt: new Date(b.end!),
      }));

    await prisma.googleCalendarConnection.update({
      where: { businessId },
      data: {
        busyCacheJson: JSON.stringify(
          intervals.map((i) => ({
            start: i.scheduledAt.toISOString(),
            end: i.endsAt.toISOString(),
          }))
        ),
        busyCacheExpiresAt: new Date(Date.now() + BUSY_CACHE_MS),
      },
    });

    return intervals;
  } catch (err) {
    console.error("[GoogleCalendar] freebusy failed:", err);
    return parseBusyCache(conn.busyCacheJson);
  }
}

export function mergeBusyIntervals(
  a: BusyInterval[],
  b: BusyInterval[]
): BusyInterval[] {
  const all = [...a, ...b].sort(
    (x, y) => x.scheduledAt.getTime() - y.scheduledAt.getTime()
  );
  if (all.length === 0) return [];

  const merged: BusyInterval[] = [all[0]!];
  for (let i = 1; i < all.length; i++) {
    const cur = all[i]!;
    const last = merged[merged.length - 1]!;
    if (cur.scheduledAt.getTime() <= last.endsAt.getTime()) {
      if (cur.endsAt.getTime() > last.endsAt.getTime()) {
        last.endsAt = cur.endsAt;
      }
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

export function intervalsOverlap(
  start: Date,
  end: Date,
  busy: BusyInterval[]
): boolean {
  const t0 = start.getTime();
  const t1 = end.getTime();
  return busy.some(
    (b) => t0 < b.endsAt.getTime() && t1 > b.scheduledAt.getTime()
  );
}

export async function invalidateGoogleBusyCache(businessId: string) {
  await prisma.googleCalendarConnection.updateMany({
    where: { businessId },
    data: { busyCacheJson: null, busyCacheExpiresAt: null },
  });
}
