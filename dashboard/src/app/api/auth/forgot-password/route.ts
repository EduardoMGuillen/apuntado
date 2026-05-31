import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/emails/send";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);
    const normalized = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    if (user?.passwordHash) {
      const token = await createPasswordResetToken(user.id);
      sendPasswordResetEmail(user.email, user.name, token).catch(console.error);
    }

    return NextResponse.json({
      ok: true,
      message:
        "Si el email está registrado con contraseña, recibirás un enlace para restablecerla.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al procesar solicitud" }, { status: 500 });
  }
}
