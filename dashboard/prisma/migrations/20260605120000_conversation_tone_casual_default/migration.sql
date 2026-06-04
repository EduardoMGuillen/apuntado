-- Default tone: casual (tú, sin voseo) for new businesses
ALTER TABLE "BusinessSettings" ALTER COLUMN "conversationTone" SET DEFAULT 'casual_hn';
