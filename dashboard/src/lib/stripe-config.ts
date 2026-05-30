/** true cuando Stripe está listo para cobrar de verdad */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const basic = process.env.STRIPE_PRICE_ID_BASIC?.trim();
  const pro = process.env.STRIPE_PRICE_ID_PRO?.trim();
  return !!(key && basic && pro && key.startsWith("sk_"));
}

export function isSimulatedStripeId(id: string | null | undefined): boolean {
  return !!id && (id.startsWith("sim_") || id.startsWith("dev_"));
}
