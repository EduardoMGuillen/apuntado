import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function getSession() {
  return getServerSession(getAuthOptions());
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }
  return session;
}
