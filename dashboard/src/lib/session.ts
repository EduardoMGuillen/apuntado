import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import type { Session } from "next-auth";

/**
 * Lee la sesión JWT desde cookies en App Router.
 * getServerSession() no recibe cookies en RSC — causa redirect loop en producción.
 */
export async function getSession(): Promise<Session | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("[auth] NEXTAUTH_SECRET no configurado");
    return null;
  }

  const cookieStore = cookies();
  const headersList = headers();

  const token = await getToken({
    req: {
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value])
      ),
      headers: Object.fromEntries(headersList.entries()),
    } as Parameters<typeof getToken>[0]["req"],
    secret,
  });

  if (!token) return null;

  const id = (token.id as string | undefined) || token.sub;
  if (!id) return null;

  return {
    user: {
      id,
      email: (token.email as string | undefined) ?? null,
      name: (token.name as string | undefined) ?? null,
      image: (token.picture as string | undefined) ?? null,
      role: (token.role as "user" | "super_admin" | undefined) ?? "user",
    },
    expires: token.exp
      ? new Date((token.exp as number) * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }
  return session;
}
