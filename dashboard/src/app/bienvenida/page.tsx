import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { GreetingScreen } from "@/components/onboarding/greeting-screen";

export default async function BienvenidaPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { ownerId: session.user.id },
  });
  if (business) redirect(`/app/${business.id}`);

  const firstName =
    session.user.name?.trim().split(/\s+/)[0] || "ahí";

  return <GreetingScreen firstName={firstName} />;
}
