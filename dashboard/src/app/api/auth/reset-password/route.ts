import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { sendPasswordChangedEmail } from "@/lib/emails/send";

const schema = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = schema.parse(body);

    const consumed = await consumePasswordResetToken(token);
    if (!consumed) {
      return NextResponse.json(
        { error: "Enlace inválido o expirado. Solicitá uno nuevo." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: consumed.userId },
      data: { passwordHash },
      select: { email: true, name: true },
    });

    sendPasswordChangedEmail(user.email, user.name).catch(console.error);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Contraseña inválida (mínimo 8 caracteres)" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Error al restablecer contraseña" }, { status: 500 });
  }
}
