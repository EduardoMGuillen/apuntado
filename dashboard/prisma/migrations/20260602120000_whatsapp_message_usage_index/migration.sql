-- Índice para conteo mensual de conversaciones (plan Básico)
CREATE INDEX IF NOT EXISTS "WhatsappMessage_business_fromClient_createdAt_idx"
ON "WhatsappMessage"("businessId", "fromClient", "createdAt");
