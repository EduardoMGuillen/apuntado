import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth("/onboarding");
  return children;
}
