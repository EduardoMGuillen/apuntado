import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

function getAuthSecret(): string | undefined {
  return process.env.NEXTAUTH_SECRET;
}

function buildAuthOptions(): NextAuthOptions {
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
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user?.passwordHash) return null;

          const valid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
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
    secret: getAuthSecret(),
    adapter: process.env.DATABASE_URL
      ? (PrismaAdapter(prisma) as NextAuthOptions["adapter"])
      : undefined,
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
    },
    pages: {
      signIn: "/login",
      error: "/login",
    },
    providers,
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider === "credentials") {
          return !!user?.id;
        }
        return true;
      },
      async jwt({ token, user }) {
        if (user?.id) {
          token.id = user.id;
          token.sub = user.id;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          const id = (token.id as string) || token.sub;
          if (id) session.user.id = id;
        }
        return session;
      },
    },
    debug: process.env.NODE_ENV === "development",
  };
}

/** Opciones estables para NextAuth (route + getServerSession + middleware) */
export const authOptions: NextAuthOptions = buildAuthOptions();

export function getAuthOptions(): NextAuthOptions {
  return authOptions;
}
