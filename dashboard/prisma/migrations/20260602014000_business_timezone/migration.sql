ALTER TABLE "BusinessSettings"
ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'America/Tegucigalpa';
