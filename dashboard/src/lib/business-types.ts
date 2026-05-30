export const BUSINESS_TYPE_CATEGORIES = [
  {
    label: "Belleza y bienestar",
    types: [
      { value: "salon", label: "Salón de belleza" },
      { value: "barbershop", label: "Barbería" },
      { value: "nails", label: "Uñas y manicure" },
      { value: "massage", label: "Masajes y spa" },
      { value: "waxing", label: "Depilación" },
      { value: "makeup", label: "Maquillaje profesional" },
      { value: "yoga", label: "Yoga y pilates" },
      { value: "gym", label: "Gimnasio" },
      { value: "personal_trainer", label: "Entrenador personal" },
    ],
  },
  {
    label: "Salud",
    types: [
      { value: "clinic", label: "Clínica médica" },
      { value: "dentist", label: "Dentista" },
      { value: "physiotherapy", label: "Fisioterapia" },
      { value: "psychology", label: "Psicología" },
      { value: "nutrition", label: "Nutrición" },
      { value: "optometry", label: "Óptica" },
      { value: "veterinary", label: "Veterinaria" },
      { value: "pet_grooming", label: "Peluquería canina" },
      { value: "pharmacy", label: "Farmacia (consultas)" },
      { value: "lab", label: "Laboratorio clínico" },
    ],
  },
  {
    label: "Automotriz",
    types: [
      { value: "mechanic", label: "Taller mecánico" },
      { value: "car_wash", label: "Lavado de autos" },
      { value: "tire_shop", label: "Llantera" },
      { value: "auto_detailing", label: "Detailing automotriz" },
      { value: "driving_school", label: "Escuela de manejo" },
    ],
  },
  {
    label: "Hogar y oficios",
    types: [
      { value: "plumbing", label: "Plomería" },
      { value: "electrician", label: "Electricista" },
      { value: "cleaning", label: "Limpieza a domicilio" },
      { value: "handyman", label: "Mantenimiento del hogar" },
      { value: "locksmith", label: "Cerrajería" },
      { value: "landscaping", label: "Jardinería" },
      { value: "pest_control", label: "Control de plagas" },
      { value: "moving", label: "Mudanzas" },
      { value: "welding", label: "Soldadura y herrería" },
    ],
  },
  {
    label: "Profesional y servicios",
    types: [
      { value: "legal", label: "Consultoría legal" },
      { value: "accounting", label: "Contabilidad" },
      { value: "notary", label: "Notaría" },
      { value: "insurance", label: "Seguros" },
      { value: "real_estate", label: "Inmobiliaria" },
      { value: "consulting", label: "Consultoría de negocios" },
      { value: "marketing", label: "Marketing digital" },
      { value: "tech_repair", label: "Reparación de celulares/PC" },
    ],
  },
  {
    label: "Educación y creativos",
    types: [
      { value: "tutoring", label: "Tutorías y clases" },
      { value: "music_school", label: "Escuela de música" },
      { value: "photography", label: "Fotografía" },
      { value: "videography", label: "Video y producción" },
      { value: "tattoo", label: "Tatuajes" },
      { value: "interior_design", label: "Diseño de interiores" },
      { value: "printing", label: "Imprenta" },
    ],
  },
  {
    label: "Comercio y gastronomía",
    types: [
      { value: "restaurant", label: "Restaurante (reservas)" },
      { value: "cafe", label: "Cafetería" },
      { value: "bakery", label: "Panadería / repostería" },
      { value: "catering", label: "Catering" },
      { value: "florist", label: "Floristería" },
      { value: "tailoring", label: "Sastrería / arreglos de ropa" },
    ],
  },
  {
    label: "Eventos y hospedaje",
    types: [
      { value: "event_planning", label: "Organización de eventos" },
      { value: "hotel", label: "Hotel / hospedaje" },
      { value: "coworking", label: "Coworking / oficinas" },
      { value: "travel", label: "Agencia de viajes" },
      { value: "daycare", label: "Guardería / cuidado infantil" },
    ],
  },
  {
    label: "Otros",
    types: [{ value: "other", label: "Otro" }],
  },
] as const;

export const BUSINESS_TYPES = BUSINESS_TYPE_CATEGORIES.flatMap((category) =>
  category.types.map((type) => ({ ...type }))
);

export type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

export const BUSINESS_TYPE_VALUES = BUSINESS_TYPES.map(
  (t) => t.value
) as [BusinessType, ...BusinessType[]];

export function getBusinessTypeLabel(value: string): string {
  return BUSINESS_TYPES.find((t) => t.value === value)?.label ?? value;
}
