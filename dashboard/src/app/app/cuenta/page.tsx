"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/dashboard/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export default function CuentaPage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirm) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cambiar la contraseña");
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi cuenta"
        description="Datos de acceso y seguridad"
      />

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{session?.user?.email || "—"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Nombre</p>
          <p className="font-medium">{session?.user?.name || "—"}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold mb-1">Cambiar contraseña</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Solo aplica si iniciás sesión con email y contraseña.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-accent/10 p-3 text-sm text-accent-foreground">
              Contraseña actualizada correctamente.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="current">Contraseña actual</Label>
            <PasswordInput
              id="current"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">Nueva contraseña</Label>
            <PasswordInput
              id="new"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar nueva contraseña</Label>
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
            className={cn(buttonVariants(), "rounded-full font-semibold")}
          >
            {loading ? "Guardando..." : "Actualizar contraseña"}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          ¿Olvidaste tu contraseña?{" "}
          <Link href="/forgot-password" className="text-primary hover:underline">
            Restablecer por email
          </Link>
        </p>
      </div>
    </div>
  );
}
