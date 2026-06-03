import { prisma } from "@/lib/prisma";
import { getBusinessDayRangeUtc } from "@/lib/business-datetime";
import {
  fetchGoogleBusyIntervals,
  mergeBusyIntervals,
  type BusyInterval,
} from "./busy";

export async function getDbAppointmentsBusy(
  businessId: string,
  timezone: string,
  dayCount = 3
): Promise<BusyInterval[]> {
  const { start: rangeStart, end: rangeEnd } = getBusinessDayRangeUtc(
    timezone,
    dayCount
  );
  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      scheduledAt: { gte: rangeStart, lt: rangeEnd },
      status: { in: ["pending", "confirmed"] },
    },
    select: { scheduledAt: true, endsAt: true },
  });
  return appointments;
}

export async function getMergedAvailabilityBusy(
  businessId: string,
  timezone: string,
  dayCount = 3
): Promise<BusyInterval[]> {
  const dbBusy = await getDbAppointmentsBusy(businessId, timezone, dayCount);
  const googleBusy = await fetchGoogleBusyIntervals(
    businessId,
    timezone,
    dayCount
  );
  return mergeBusyIntervals(dbBusy, googleBusy);
}
