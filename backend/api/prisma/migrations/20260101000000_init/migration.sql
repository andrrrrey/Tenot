-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "Category" (
    "id"   SERIAL  NOT NULL,
    "name" TEXT    NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id"        SERIAL       NOT NULL,
    "email"     TEXT         NOT NULL,
    "password"  TEXT         NOT NULL,
    "name"      TEXT,
    "phone"     TEXT,
    "role"      "Role"       NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable
CREATE TABLE "Listing" (
    "id"          SERIAL         NOT NULL,
    "title"       TEXT           NOT NULL,
    "article"     TEXT           NOT NULL DEFAULT '',
    "description" TEXT           NOT NULL,
    "price"       DOUBLE PRECISION NOT NULL,
    "isActive"    BOOLEAN        NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"      INTEGER        NOT NULL,
    "categoryId"  INTEGER        NOT NULL,
    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Listing" ADD CONSTRAINT "Listing_userId_fkey"     FOREIGN KEY ("userId")     REFERENCES "User"("id")     ON DELETE RESTRICT  ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT  ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ListingImage" (
    "id"        SERIAL  NOT NULL,
    "url"       TEXT    NOT NULL,
    "listingId" INTEGER NOT NULL,
    CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ListingImage" ADD CONSTRAINT "ListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Chat" (
    "id"          SERIAL  NOT NULL,
    "initiatorId" INTEGER NOT NULL,
    "ownerId"     INTEGER NOT NULL,
    "listingId"   INTEGER NOT NULL,
    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Chat" ADD CONSTRAINT "Chat_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id")    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_ownerId_fkey"     FOREIGN KEY ("ownerId")     REFERENCES "User"("id")    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_listingId_fkey"   FOREIGN KEY ("listingId")   REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Message" (
    "id"        SERIAL       NOT NULL,
    "chatId"    INTEGER      NOT NULL,
    "senderId"  INTEGER      NOT NULL,
    "text"      TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey"   FOREIGN KEY ("chatId")   REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Favorite" (
    "id"        SERIAL  NOT NULL,
    "userId"    INTEGER NOT NULL,
    "listingId" INTEGER NOT NULL,
    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Favorite_userId_listingId_key" ON "Favorite"("userId", "listingId");
