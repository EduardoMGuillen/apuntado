import Link from "next/link";
import { Logo } from "@/components/logo";
import { PoweredByNexus } from "@/components/powered-by-nexus";
import { CA_FOOTER_FLAGS } from "@/lib/region";

export function LandingFooter() {
  return (
    <footer className="border-t bg-card py-12 pb-safe">
      <div className="container mx-auto flex flex-col items-center gap-6 px-4 text-center lg:px-8">
        <Logo size={32} />
        <div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Apuntado · Citas por WhatsApp · Centroamérica {CA_FOOTER_FLAGS}
          </p>
          <PoweredByNexus className="mt-2 justify-center" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            Iniciar sesión
          </Link>
          <Link href="/register" className="hover:text-foreground">
            Registrarse
          </Link>
          <Link href="/terminos" className="hover:text-foreground">
            Términos
          </Link>
          <Link href="/politicas" className="hover:text-foreground">
            Políticas
          </Link>
        </div>
      </div>
    </footer>
  );
}
