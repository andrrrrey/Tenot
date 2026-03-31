-- CreateEnum (safe - skip if exists)
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Category" (
    "id"   SERIAL  NOT NULL,
    "name" TEXT    NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id"        SERIAL       NOT NULL,
    "email"     TEXT         NOT NULL,
    "password"  TEXT         NOT NULL,
    "name"      TEXT,
    "phone"     TEXT,
    "role"      "Role"       NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateTable
CREATE TABLE IF NOT EXISTS "Listing" (
    "id"          SERIAL           NOT NULL,
    "title"       TEXT             NOT NULL,
    "article"     TEXT             NOT NULL DEFAULT '',
    "description" TEXT             NOT NULL,
    "price"       DOUBLE PRECISION NOT NULL,
    "isActive"    BOOLEAN          NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"      INTEGER          NOT NULL,
    "categoryId"  INTEGER          NOT NULL,
    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Listing" ADD CONSTRAINT "Listing_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Listing" ADD CONSTRAINT "Listing_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ListingImage" (
    "id"        SERIAL  NOT NULL,
    "url"       TEXT    NOT NULL,
    "listingId" INTEGER NOT NULL,
    CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ListingImage" ADD CONSTRAINT "ListingImage_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Chat" (
    "id"          SERIAL  NOT NULL,
    "initiatorId" INTEGER NOT NULL,
    "ownerId"     INTEGER NOT NULL,
    "listingId"   INTEGER NOT NULL,
    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Chat" ADD CONSTRAINT "Chat_initiatorId_fkey"
    FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Chat" ADD CONSTRAINT "Chat_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Chat" ADD CONSTRAINT "Chat_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Message" (
    "id"        SERIAL       NOT NULL,
    "chatId"    INTEGER      NOT NULL,
    "senderId"  INTEGER      NOT NULL,
    "text"      TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey"
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Favorite" (
    "id"        SERIAL  NOT NULL,
    "userId"    INTEGER NOT NULL,
    "listingId" INTEGER NOT NULL,
    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_listingId_key" ON "Favorite"("userId", "listingId");
