/*
  Warnings:

  - You are about to drop the `EntranceInteraction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketInteraction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EntranceInteraction" DROP CONSTRAINT "EntranceInteraction_entranceId_fkey";

-- DropForeignKey
ALTER TABLE "EntranceInteraction" DROP CONSTRAINT "EntranceInteraction_userId_fkey";

-- DropForeignKey
ALTER TABLE "TicketInteraction" DROP CONSTRAINT "TicketInteraction_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketInteraction" DROP CONSTRAINT "TicketInteraction_userId_fkey";

-- DropTable
DROP TABLE "EntranceInteraction";

-- DropTable
DROP TABLE "TicketInteraction";

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT,
    "entranceId" TEXT,
    "method" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "output" JSONB,
    "input" JSONB,
    "fees" TEXT,
    "type" "SmartContractInteractionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_entranceId_fkey" FOREIGN KEY ("entranceId") REFERENCES "Entrance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add CHECK constraint
ALTER TABLE "Interaction" ADD CONSTRAINT "ticket_or_entrance_check"
CHECK (
  (("ticketId" IS NOT NULL)::INTEGER + ("entranceId" IS NOT NULL)::INTEGER) = 1
);