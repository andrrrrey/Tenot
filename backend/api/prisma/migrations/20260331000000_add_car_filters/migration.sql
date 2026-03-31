-- Add hasCarFilter to Category
ALTER TABLE "Category" ADD COLUMN "hasCarFilter" BOOLEAN NOT NULL DEFAULT false;

-- Create CarMake table
CREATE TABLE "CarMake" (
  "id"   SERIAL  PRIMARY KEY,
  "name" TEXT    NOT NULL UNIQUE
);

-- Create CarModel table
CREATE TABLE "CarModel" (
  "id"       SERIAL  PRIMARY KEY,
  "name"     TEXT    NOT NULL,
  "makeId"   INTEGER NOT NULL REFERENCES "CarMake"("id") ON DELETE CASCADE,
  "yearFrom" INTEGER NOT NULL,
  "yearTo"   INTEGER,
  UNIQUE ("name", "makeId")
);

-- Add car fields to Listing
ALTER TABLE "Listing" ADD COLUMN "carMakeId"  INTEGER REFERENCES "CarMake"("id")  ON DELETE SET NULL;
ALTER TABLE "Listing" ADD COLUMN "carModelId" INTEGER REFERENCES "CarModel"("id") ON DELETE SET NULL;
ALTER TABLE "Listing" ADD COLUMN "carYear"    INTEGER;
