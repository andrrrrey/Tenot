-- 360°-контент объявлений (вращение по кадрам; позже — панорама салона)
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "has360" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "Listing360" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "frames" TEXT[],
    "previewUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Listing360_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Listing360_listingId_kind_key" ON "Listing360"("listingId", "kind");

ALTER TABLE "Listing360" ADD CONSTRAINT "Listing360_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
