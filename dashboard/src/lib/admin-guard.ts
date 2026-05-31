import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isSuperAdminSession } from "@/lib/business-access";

export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session?.user?.id || !isSuperAdminSession(session)) {
    redirect("/login?callbackUrl=/admin");
  }
  return session;
}
