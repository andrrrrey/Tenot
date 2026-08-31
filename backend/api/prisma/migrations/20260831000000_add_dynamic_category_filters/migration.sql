-- Universal category profiles and dynamic listing attributes.
CREATE TYPE "CategoryFieldType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT');

ALTER TABLE "Category"
  ADD COLUMN "filterProfile" TEXT,
  ADD COLUMN "templateKey" TEXT;

CREATE UNIQUE INDEX "Category_templateKey_key" ON "Category"("templateKey");

CREATE TABLE "CategoryField" (
  "id" SERIAL PRIMARY KEY,
  "categoryId" INTEGER NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" "CategoryFieldType" NOT NULL DEFAULT 'TEXT',
  "unit" TEXT,
  "options" JSONB,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "filterable" BOOLEAN NOT NULL DEFAULT true,
  "showInForm" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CategoryField_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CategoryField_categoryId_key_key" ON "CategoryField"("categoryId", "key");
CREATE INDEX "CategoryField_categoryId_sortOrder_idx" ON "CategoryField"("categoryId", "sortOrder");

CREATE TABLE "ListingAttribute" (
  "id" SERIAL PRIMARY KEY,
  "listingId" INTEGER NOT NULL,
  "categoryFieldId" INTEGER NOT NULL,
  "textValue" TEXT,
  "numberValue" DOUBLE PRECISION,
  "booleanValue" BOOLEAN,
  "jsonValue" JSONB,
  CONSTRAINT "ListingAttribute_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ListingAttribute_categoryFieldId_fkey"
    FOREIGN KEY ("categoryFieldId") REFERENCES "CategoryField"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ListingAttribute_listingId_categoryFieldId_key"
  ON "ListingAttribute"("listingId", "categoryFieldId");
CREATE INDEX "ListingAttribute_categoryFieldId_textValue_idx"
  ON "ListingAttribute"("categoryFieldId", "textValue");
CREATE INDEX "ListingAttribute_categoryFieldId_numberValue_idx"
  ON "ListingAttribute"("categoryFieldId", "numberValue");
CREATE INDEX "ListingAttribute_categoryFieldId_booleanValue_idx"
  ON "ListingAttribute"("categoryFieldId", "booleanValue");

-- Keep the current automobile categories compatible with the new profile selector.
UPDATE "Category" SET "filterProfile" = 'AUTO' WHERE "hasCarFilter" = true;
