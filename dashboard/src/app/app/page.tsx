import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isSuperAdminSession } from "@/lib/business-access";

export default async function AppRootPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  if (isSuperAdminSession(session)) {
    const owned = await prisma.business.count({
      where: { ownerId: session.user.id },
    });
    if (owned === 0) redirect("/admin");
  }

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
