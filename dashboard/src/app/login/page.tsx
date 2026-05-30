"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
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

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const urlError = searchParams.get("error");
  const registered = searchParams.get("registered");

  useEffect(() => {
    if (urlError) {
      setError(ERROR_MESSAGES[urlError] ?? ERROR_MESSAGES.Default);
    }
  }, [urlError]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (!result) {
        setError("No se pudo conectar con el servidor.");
        return;
      }

      if (result.error) {
        setError(
          ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.Default
        );
        return;
      }

      if (!result.ok) {
        setError(ERROR_MESSAGES.Default);
        return;
      }

      // Recarga completa para que middleware y servidor lean la cookie JWT
      const callback = searchParams.get("callbackUrl") || "/app";
      window.location.href = callback.startsWith("/")
        ? callback
        : "/app";
    } catch (err) {
      console.error("[login]", err);
      setError(
        "Error de conexión. En Vercel verificá DATABASE_URL, NEXTAUTH_SECRET y NEXTAUTH_URL (https://www.apuntado.app)."
      );
    } finally {
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
          <Label htmlFor="password">Contraseña</Label>
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
          onClick={() =>
            signIn("google", {
              callbackUrl: searchParams.get("callbackUrl") || "/app",
            })
          }
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
