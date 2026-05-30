export const DEFAULT_SCHEDULE_ROWS = [
  { dayOfWeek: 0, openTime: "08:00", closeTime: "12:00", isOpen: false },
  { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 6, openTime: "08:00", closeTime: "14:00", isOpen: true },
] as const;

export function mergeSchedules(
  existing: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
  }[]
) {
  return DEFAULT_SCHEDULE_ROWS.map((def) => {
    const row = existing.find((s) => s.dayOfWeek === def.dayOfWeek);
    return row
      ? {
          dayOfWeek: row.dayOfWeek,
          openTime: row.openTime,
          closeTime: row.closeTime,
          isOpen: row.isOpen,
        }
      : { ...def };
  });
}
