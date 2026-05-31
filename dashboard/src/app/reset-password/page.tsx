"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (!token) {
      setError("Enlace inválido. Solicitá uno nuevo.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo restablecer la contraseña");
        return;
      }

      router.push("/login?reset=1");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Enlace inválido" subtitle="Solicitá un nuevo enlace">
        <div className="glass-card space-y-4 rounded-2xl p-6 sm:p-8">
          <p className="text-sm text-muted-foreground">
            Este enlace no es válido o ya expiró.
          </p>
          <Link
            href="/forgot-password"
            className={cn(buttonVariants(), "inline-flex h-11 w-full justify-center rounded-full font-semibold")}
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Nueva contraseña"
      subtitle="Elegí una contraseña segura para tu cuenta"
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
          <Label htmlFor="password">Nueva contraseña</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
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
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Nueva contraseña" subtitle="Cargando...">
          <div className="glass-card h-64 animate-pulse rounded-2xl" />
        </AuthLayout>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
