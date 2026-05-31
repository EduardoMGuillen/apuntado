"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al enviar el correo");
        return;
      }

      setSent(true);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="¿Olvidaste tu contraseña?"
      subtitle="Te enviamos un enlace para crear una nueva"
    >
      {sent ? (
        <div className="glass-card space-y-4 rounded-2xl p-6 sm:p-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Si el email está registrado con contraseña, recibirás un enlace en los
            próximos minutos. Revisá también la carpeta de spam.
          </p>
          <Link
            href="/login"
            className={cn(buttonVariants(), "inline-flex h-11 w-full justify-center rounded-full font-semibold")}
          >
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
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
              type="email"
              autoComplete="email"
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              ← Volver al login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
