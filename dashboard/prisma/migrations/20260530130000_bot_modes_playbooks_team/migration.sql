-- Modos de onboarding, playbooks, web, escalación a agente y equipo Pro

-- BusinessSettings: modo del bot, web, reglas personalizadas, alertas
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "bookingMode" TEXT NOT NULL DEFAULT 'services';
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "botPlaybooks" TEXT;
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "notifyPhone" TEXT;

-- Employee: WhatsApp del miembro para alertas (plan Pro)
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "whatsappPhone" TEXT;
