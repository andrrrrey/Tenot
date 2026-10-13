-- Вход по SMS-коду: телефон для авторизации, email/пароль становятся необязательными
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authPhone" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_authPhone_key" ON "User"("authPhone");

CREATE TABLE IF NOT EXISTS "PhoneOtp" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "deviceId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PhoneOtp_phone_createdAt_idx" ON "PhoneOtp"("phone", "createdAt");
CREATE INDEX IF NOT EXISTS "PhoneOtp_ip_createdAt_idx" ON "PhoneOtp"("ip", "createdAt");
CREATE INDEX IF NOT EXISTS "PhoneOtp_deviceId_createdAt_idx" ON "PhoneOtp"("deviceId", "createdAt");
CREATE INDEX IF NOT EXISTS "PhoneOtp_createdAt_idx" ON "PhoneOtp"("createdAt");
