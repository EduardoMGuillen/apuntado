"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email o contraseña incorrectos",
  OAuthSignin: "Error al iniciar sesión con Google",
  OAuthCallback: "Error al volver de Google. Revisá las URLs en Google Cloud.",
  OAuthAccountNotLinked:
    "Este email ya está registrado con contraseña. Usá email y contraseña.",
  Configuration:
    "Error de configuración del servidor (NEXTAUTH_URL o DATABASE_URL).",
  Default: "No se pudo iniciar sesión. Intentá de nuevo.",
};

function resolveCallbackUrl(raw: string | null): string {
  if (!raw) return "/app";
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw);
    if (typeof window !== "undefined" && url.hostname === window.location.hostname) {
      return url.pathname + url.search;
    }
  } catch {
    /* ignore */
  }
  return "/app";
}

function LoginForm() {
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const urlError = searchParams.get("error");
  const registered = searchParams.get("registered");
  const reset = searchParams.get("reset");
  const callbackUrl = resolveCallbackUrl(searchParams.get("callbackUrl"));

  useEffect(() => {
    if (urlError) {
      setError(ERROR_MESSAGES[urlError] ?? ERROR_MESSAGES.Default);
    }
  }, [urlError]);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl || "/app");
    }
  }, [status, router, callbackUrl]);

  if (status === "loading" || status === "authenticated") {
    return (
      <AuthLayout title="Bienvenido de vuelta" subtitle="Verificando sesión...">
        <div className="glass-card h-64 animate-pulse rounded-2xl" />
      </AuthLayout>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // redirect: true → NextAuth setea la cookie y redirige en un solo flujo (más fiable)
      await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        callbackUrl,
        redirect: true,
      });
    } catch (err) {
      console.error("[login]", err);
      setError(
        "Error de conexión. Verificá DATABASE_URL, NEXTAUTH_SECRET y NEXTAUTH_URL en Vercel."
      );
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Bienvenido de vuelta"
      subtitle="Ingresá a tu panel de Apuntado"
    >
      <form
        onSubmit={handleSubmit}
        className="glass-card space-y-5 rounded-2xl p-6 sm:p-8"
      >
        {registered && !error && (
          <p className="rounded-lg bg-accent/10 p-3 text-sm text-accent-foreground">
            Cuenta creada. Iniciá sesión con tu email y contraseña.
          </p>
        )}
        {reset && !error && (
          <p className="rounded-lg bg-accent/10 p-3 text-sm text-accent-foreground">
            Contraseña actualizada. Iniciá sesión con tu nueva contraseña.
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={cn(
            buttonVariants(),
            "h-11 w-full rounded-full font-semibold"
          )}
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">o</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-full"
          disabled={loading}
          onClick={() => signIn("google", { callbackUrl })}
        >
          Continuar con Google
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Registrate gratis
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Bienvenido de vuelta" subtitle="Cargando...">
          <div className="glass-card h-64 animate-pulse rounded-2xl" />
        </AuthLayout>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
