-- Listing view counter (shown alongside favorites count)
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "viewsCount" INTEGER NOT NULL DEFAULT 0;
