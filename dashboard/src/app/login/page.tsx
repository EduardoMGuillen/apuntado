"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        setError("No se pudo conectar con el servidor. Revisá tu conexión.");
        return;
      }

      if (result.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Email o contraseña incorrectos"
            : "No se pudo iniciar sesión. Intentá de nuevo."
        );
        return;
      }

      if (!result.ok) {
        setError("No se pudo iniciar sesión. Intentá de nuevo.");
        return;
      }

      // Redirección completa para que la cookie de sesión se aplique antes del middleware
      window.location.assign("/app");
    } catch {
      setError(
        "Error de conexión. Si estás en producción, verificá que DATABASE_URL y NEXTAUTH_URL estén configurados."
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
          onClick={() => signIn("google", { callbackUrl: "/app" })}
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
