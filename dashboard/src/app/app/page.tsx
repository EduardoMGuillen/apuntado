import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AppRootPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!business) redirect("/onboarding");
  redirect(`/app/${business.id}`);
}
