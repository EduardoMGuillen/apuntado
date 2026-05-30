export const BOOKING_MODES = [
  {
    id: "services",
    label: "Servicios con cita",
    short: "Servicios",
    description: "Salones, clínicas, talleres — cada cita tiene duración y precio.",
    examples: "Corte, consulta médica, cambio de aceite",
    icon: "🗓️",
  },
  {
    id: "menu",
    label: "Menú o catálogo",
    short: "Menú",
    description: "Restaurantes, cafés, tiendas — mostrá opciones y precios por WhatsApp.",
    examples: "Platillos, bebidas, productos",
    icon: "📋",
  },
  {
    id: "inquiries",
    label: "Solo consultas",
    short: "Consultas",
    description: "Agendá citas sin catálogo fijo. Ideal para consultorías y reservas generales.",
    examples: "Abogado, inmobiliaria, asesorías",
    icon: "💬",
  },
] as const;

export type BookingMode = (typeof BOOKING_MODES)[number]["id"];

export const BOOKING_MODE_VALUES = BOOKING_MODES.map((m) => m.id) as [
  BookingMode,
  ...BookingMode[],
];

const MENU_DEFAULT_TYPES = new Set([
  "restaurant",
  "cafe",
  "bakery",
  "catering",
  "florist",
]);

const INQUIRIES_DEFAULT_TYPES = new Set([
  "legal",
  "real_estate",
  "consulting",
  "accounting",
  "insurance",
  "marketing",
  "notary",
]);

export function getSuggestedBookingMode(businessType: string): BookingMode {
  if (MENU_DEFAULT_TYPES.has(businessType)) return "menu";
  if (INQUIRIES_DEFAULT_TYPES.has(businessType)) return "inquiries";
  return "services";
}

export function getBookingModeConfig(mode: BookingMode) {
  return BOOKING_MODES.find((m) => m.id === mode)!;
}

export const DEFAULT_INQUIRY_SERVICE = {
  name: "Consulta general",
  durationMin: 30,
  priceHNL: 0,
};

/** Duración interna para ítems de menú (reservas / pedidos). No se muestra en onboarding. */
export const MENU_ITEM_DURATION_MIN = 30;
