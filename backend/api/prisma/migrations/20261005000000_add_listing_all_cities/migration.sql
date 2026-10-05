-- Allow admins to publish a listing for all cities
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "allCities" BOOLEAN NOT NULL DEFAULT false;
