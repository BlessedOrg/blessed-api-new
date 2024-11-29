/*
  Warnings:

  - You are about to drop the column `appId` on the `Entrance` table. All the data in the column will be lost.
  - You are about to drop the column `developerId` on the `Entrance` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Entrance` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Entrance` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ticketId,eventId]` on the table `Entrance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[entranceId]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Entrance" DROP CONSTRAINT "Entrance_appId_fkey";

-- DropForeignKey
ALTER TABLE "Entrance" DROP CONSTRAINT "Entrance_developerId_fkey";

-- DropIndex
DROP INDEX "Entrance_slug_eventId_key";

-- AlterTable
ALTER TABLE "Entrance" DROP COLUMN "appId",
DROP COLUMN "developerId",
DROP COLUMN "name",
DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "entranceId" TEXT;

-- CreateTable
CREATE TABLE "EventBouncer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventBouncer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entrance_ticketId_eventId_key" ON "Entrance"("ticketId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_entranceId_key" ON "Ticket"("entranceId");

-- AddForeignKey
ALTER TABLE "EventBouncer" ADD CONSTRAINT "EventBouncer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBouncer" ADD CONSTRAINT "EventBouncer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
