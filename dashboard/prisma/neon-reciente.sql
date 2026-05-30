-- =============================================================================
-- Apuntado — SQL para Neon (base ya creada con SQL INICIAL.txt)
-- Ejecutá todo este bloque en el SQL Editor de Neon.
-- Es idempotente: IF NOT EXISTS no rompe si ya corriste parte antes.
-- =============================================================================

-- 1) Modo de negocio en onboarding (services | menu | inquiries)
ALTER TABLE "BusinessSettings"
  ADD COLUMN IF NOT EXISTS "bookingMode" TEXT NOT NULL DEFAULT 'services';
ALTER TABLE "BusinessSettings"
  ADD COLUMN IF NOT EXISTS "welcomeMenuGreeting" TEXT;
ALTER TABLE "BusinessSettings"
  ADD COLUMN IF NOT EXISTS "welcomeMenuOptions" TEXT;

-- 2) Sitio web que el bot lee para eventos/promos
ALTER TABLE "BusinessSettings"
  ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;

-- 3) Reglas personalizadas del bot (JSON: [{ when, action }])
ALTER TABLE "BusinessSettings"
  ADD COLUMN IF NOT EXISTS "botPlaybooks" TEXT;

-- 4) WhatsApp personal para alertas cuando un cliente pide agente
ALTER TABLE "BusinessSettings"
  ADD COLUMN IF NOT EXISTS "notifyPhone" TEXT;

-- 5) WhatsApp de cada miembro del equipo (plan Pro)
ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "whatsappPhone" TEXT;

-- =============================================================================
-- Verificación (opcional): deberían aparecer las 4 columnas + whatsappPhone
-- =============================================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'BusinessSettings'
--   AND column_name IN ('bookingMode', 'websiteUrl', 'botPlaybooks', 'notifyPhone')
-- ORDER BY column_name;
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'Employee' AND column_name = 'whatsappPhone';
