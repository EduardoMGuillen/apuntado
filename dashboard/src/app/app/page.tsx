import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AppRootPage() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!business) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true },
    });
    const isNewAccount =
      user &&
      Date.now() - user.createdAt.getTime() < 15 * 60 * 1000;
    redirect(isNewAccount ? "/bienvenida" : "/onboarding");
  }
  redirect(`/app/${business.id}`);
}
