import {
  DEFAULT_INQUIRY_SERVICE,
  MENU_ITEM_DURATION_MIN,
  type BookingMode,
} from "@/lib/booking-modes";

export type OfferingInput = {
  id?: string;
  name: string;
  durationMin?: number;
  priceHNL?: number;
};

export function normalizeOfferings(
  mode: BookingMode,
  offerings: OfferingInput[]
) {
  if (mode === "inquiries") {
    return [DEFAULT_INQUIRY_SERVICE];
  }

  if (mode === "menu") {
    return offerings.map((item) => ({
      name: item.name,
      durationMin: MENU_ITEM_DURATION_MIN,
      priceHNL: item.priceHNL ?? 0,
    }));
  }

  return offerings.map((item) => ({
    name: item.name,
    durationMin: Math.max(15, item.durationMin ?? 30),
    priceHNL: item.priceHNL ?? 0,
  }));
}
