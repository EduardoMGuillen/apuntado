import Link from "next/link";
import { Logo } from "@/components/logo";

export function LandingFooter() {
  return (
    <footer className="border-t bg-card py-12">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 sm:flex-row lg:px-8">
        <Logo size={32} />
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Apuntado · Citas por WhatsApp · Honduras 🇭🇳
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            Iniciar sesión
          </Link>
          <Link href="/register" className="hover:text-foreground">
            Registrarse
          </Link>
        </div>
      </div>
    </footer>
  );
}
