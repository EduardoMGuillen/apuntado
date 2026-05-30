import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "./auth";

export async function requireAuth(callbackPath = "/app") {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  return session;
}
