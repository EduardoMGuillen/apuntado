import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { resolveUserRole, type UserRole } from "./roles";

async function resolveDbUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  return user?.id ?? null;
}

function buildAuthOptions(): NextAuthOptions {
  const secureCookie =
    process.env.NEXTAUTH_URL?.startsWith("https://") ||
    process.env.NODE_ENV === "production";
  const sessionCookieName = secureCookie
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (!process.env.DATABASE_URL) {
          console.error("[auth] DATABASE_URL no configurado");
          return null;
        }

        const email = credentials.email.trim().toLowerCase();

        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.passwordHash) return null;

          const valid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );
          if (!valid) return null;

          const role = await resolveUserRole(user.id, user.email);

          return { id: user.id, email: user.email, name: user.name, role };
        } catch (err) {
          console.error("[auth] credentials authorize failed:", err);
          return null;
        }
      },
    }),
  ];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.unshift(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  }

  return {
    secret: process.env.NEXTAUTH_SECRET,
    // Sin PrismaAdapter: rompe JWT + credentials en producción
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
    },
    cookies: {
      sessionToken: {
        name: sessionCookieName,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: !!secureCookie,
          maxAge: 30 * 24 * 60 * 60,
        },
      },
    },
    pages: {
      signIn: "/login",
      error: "/login",
    },
    providers,
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider === "google" && user.email) {
          const email = user.email.trim().toLowerCase();
          const existing = await prisma.user.findUnique({ where: { email } });
          if (!existing) {
            const role: UserRole = (await import("./roles")).isSuperAdminEmail(
              email
            )
              ? "super_admin"
              : "user";
            await prisma.user.create({
              data: {
                email,
                name: user.name || email,
                image: user.image,
                role,
              },
            });
          }
          return true;
        }
        if (account?.provider === "credentials") {
          return !!user?.id;
        }
        return true;
      },
      async jwt({ token, user, account }) {
        if (user) {
          if (account?.provider === "google" && user.email) {
            const dbId = await resolveDbUserId(user.email);
            if (dbId) {
              token.id = dbId;
              token.sub = dbId;
              token.role = await resolveUserRole(dbId, user.email);
            }
          } else if (user.id) {
            token.id = user.id;
            token.sub = user.id;
            if (user.role) {
              token.role = user.role;
            } else if (user.email) {
              token.role = await resolveUserRole(user.id, user.email);
            }
          }
        } else if (token.sub && token.email) {
          token.role = await resolveUserRole(
            token.sub,
            token.email as string
          );
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          const id = (token.id as string) || token.sub;
          if (id) session.user.id = id;
          if (token.role) {
            session.user.role = token.role as UserRole;
          }
        }
        return session;
      },
    },
    debug: process.env.NODE_ENV === "development",
  };
}

let cachedOptions: NextAuthOptions | undefined;

export function getAuthOptions(): NextAuthOptions {
  // No cachear: evita secret undefined congelado desde el build
  if (process.env.NODE_ENV === "production") {
    return buildAuthOptions();
  }
  if (!cachedOptions) {
    cachedOptions = buildAuthOptions();
  }
  return cachedOptions;
}

/** @deprecated usar getAuthOptions() */
export const authOptions = new Proxy({} as NextAuthOptions, {
  get(_target, prop) {
    return getAuthOptions()[prop as keyof NextAuthOptions];
  },
});
