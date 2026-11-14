-- Размытие госномеров на фото объявлений категории «Автомобили»
ALTER TABLE "ListingImage" ADD COLUMN IF NOT EXISTS "plateBlur" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "ListingImage" ADD COLUMN IF NOT EXISTS "plateBlurTries" INTEGER NOT NULL DEFAULT 0;
