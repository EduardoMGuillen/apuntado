import { redirect } from "next/navigation";
import { getSession } from "./session";

export async function requireAuth(callbackPath = "/app") {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  return session;
}
