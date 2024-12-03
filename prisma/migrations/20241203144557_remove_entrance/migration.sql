/*
  Warnings:

  - You are about to drop the column `contractAddress` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `entranceId` on the `Interaction` table. All the data in the column will be lost.
  - You are about to drop the column `entranceId` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the `Entrance` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[address]` on the table `Event` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metadataPayload` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Entrance" DROP CONSTRAINT "Entrance_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Entrance" DROP CONSTRAINT "Entrance_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_entranceId_fkey";

-- DropIndex
DROP INDEX "Event_contractAddress_key";

-- DropIndex
DROP INDEX "Ticket_entranceId_key";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "contractAddress",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "metadataPayload" JSONB NOT NULL,
ADD COLUMN     "metadataUrl" TEXT;

-- AlterTable
ALTER TABLE "Interaction" DROP COLUMN "entranceId",
ADD COLUMN     "eventId" TEXT;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "entranceId",
ADD COLUMN     "logoUrl" TEXT;

-- DropTable
DROP TABLE "Entrance";

-- CreateIndex
CREATE UNIQUE INDEX "Event_address_key" ON "Event"("address");

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
