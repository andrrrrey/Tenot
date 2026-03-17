-- AlterTable: make text nullable and add audioUrl field to Message
ALTER TABLE "Message" ALTER COLUMN "text" DROP NOT NULL;
ALTER TABLE "Message" ADD COLUMN "audioUrl" TEXT;
