export const siteConfig = {
  name: "Apuntado",
  title: "Apuntado — Citas por WhatsApp",
  titleTemplate: "%s | Apuntado",
  description:
    "Recibí reservas automáticamente por WhatsApp. Bot en español para salones, barberías, clínicas y restaurantes en Centroamérica. 14 días gratis.",
  keywords: [
    "citas whatsapp",
    "agenda whatsapp",
    "bot whatsapp centroamerica",
    "bot whatsapp guatemala",
    "bot whatsapp el salvador",
    "bot whatsapp honduras",
    "bot whatsapp costa rica",
    "bot whatsapp panama",
    "reservas automáticas",
    "salón belleza",
    "barbería",
    "clínica",
    "restaurante",
    "apuntado",
    "micro saas centroamerica",
  ],
  locale: "es_419",
  region: "Centroamérica",
  countries: [
    "Guatemala",
    "El Salvador",
    "Honduras",
    "Nicaragua",
    "Costa Rica",
    "Panamá",
  ],
  ogImage: "/og.png",
  ogImageWidth: 1200,
  ogImageHeight: 630,
  themeColor: "#1a6b63",
  backgroundColor: "#0a1f1d",
} as const;

export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  return url;
}
