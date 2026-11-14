-- 360°-панорама салона: флаг у объявления и текст ошибки склейки
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "hasInterior" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing360" ADD COLUMN IF NOT EXISTS "error" TEXT;
