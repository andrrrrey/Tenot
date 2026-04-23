-- Add generation field to CarModel
ALTER TABLE "CarModel" ADD COLUMN IF NOT EXISTS "generation" TEXT;

-- Add ListingStatus enum
DO $$ BEGIN
    CREATE TYPE "ListingStatus" AS ENUM ('PUBLISHED', 'DRAFT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status field to Listing (default PUBLISHED for existing rows)
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "status" "ListingStatus" NOT NULL DEFAULT 'PUBLISHED';
