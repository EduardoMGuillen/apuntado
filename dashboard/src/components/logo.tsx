import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 32, showText = true, className = "" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo.png"
        alt="Apuntado"
        width={size}
        height={size}
        className="rounded-xl"
        priority
      />
      {showText && (
        <span className="text-xl font-bold tracking-tight text-foreground">
          Apuntado
        </span>
      )}
    </Link>
  );
}
