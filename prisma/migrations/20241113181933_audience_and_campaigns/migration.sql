/*
  Warnings:

  - You are about to drop the `SmartContract` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SmartContractInteraction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SmartContract" DROP CONSTRAINT "SmartContract_appId_fkey";

-- DropForeignKey
ALTER TABLE "SmartContract" DROP CONSTRAINT "SmartContract_developerId_fkey";

-- DropForeignKey
ALTER TABLE "SmartContract" DROP CONSTRAINT "SmartContract_eventId_fkey";

-- DropForeignKey
ALTER TABLE "SmartContractInteraction" DROP CONSTRAINT "SmartContractInteraction_smartContractId_fkey";

-- DropForeignKey
ALTER TABLE "SmartContractInteraction" DROP CONSTRAINT "SmartContractInteraction_userId_fkey";

-- DropTable
DROP TABLE "SmartContract";

-- DropTable
DROP TABLE "SmartContractInteraction";

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignDistribution" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audiences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "externalWalletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AudienceUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "developerId" TEXT,
    "metadataUrl" TEXT,
    "metadataPayload" JSONB NOT NULL,
    "appId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrance" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "developerId" TEXT,
    "metadataUrl" TEXT,
    "metadataPayload" JSONB NOT NULL,
    "appId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entrance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "output" JSONB,
    "input" JSONB,
    "fees" TEXT,
    "type" "SmartContractInteractionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntranceInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entranceId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "output" JSONB,
    "input" JSONB,
    "fees" TEXT,
    "type" "SmartContractInteractionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntranceInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CampaignToTicket" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AudiencesToCampaign" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AudienceUserToAudiences" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AudienceUserToCampaignDistribution" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignDistribution_campaignId_key" ON "CampaignDistribution"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "AudienceUser_userId_key" ON "AudienceUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AudienceUser_externalWalletAddress_key" ON "AudienceUser"("externalWalletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_address_key" ON "Ticket"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_slug_eventId_key" ON "Ticket"("slug", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Entrance_address_key" ON "Entrance"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Entrance_ticketId_key" ON "Entrance"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "Entrance_slug_eventId_key" ON "Entrance"("slug", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "_CampaignToTicket_AB_unique" ON "_CampaignToTicket"("A", "B");

-- CreateIndex
CREATE INDEX "_CampaignToTicket_B_index" ON "_CampaignToTicket"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AudiencesToCampaign_AB_unique" ON "_AudiencesToCampaign"("A", "B");

-- CreateIndex
CREATE INDEX "_AudiencesToCampaign_B_index" ON "_AudiencesToCampaign"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AudienceUserToAudiences_AB_unique" ON "_AudienceUserToAudiences"("A", "B");

-- CreateIndex
CREATE INDEX "_AudienceUserToAudiences_B_index" ON "_AudienceUserToAudiences"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AudienceUserToCampaignDistribution_AB_unique" ON "_AudienceUserToCampaignDistribution"("A", "B");

-- CreateIndex
CREATE INDEX "_AudienceUserToCampaignDistribution_B_index" ON "_AudienceUserToCampaignDistribution"("B");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDistribution" ADD CONSTRAINT "CampaignDistribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audiences" ADD CONSTRAINT "Audiences_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceUser" ADD CONSTRAINT "AudienceUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "DeveloperAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrance" ADD CONSTRAINT "Entrance_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "DeveloperAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrance" ADD CONSTRAINT "Entrance_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrance" ADD CONSTRAINT "Entrance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrance" ADD CONSTRAINT "Entrance_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketInteraction" ADD CONSTRAINT "TicketInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketInteraction" ADD CONSTRAINT "TicketInteraction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntranceInteraction" ADD CONSTRAINT "EntranceInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntranceInteraction" ADD CONSTRAINT "EntranceInteraction_entranceId_fkey" FOREIGN KEY ("entranceId") REFERENCES "Entrance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignToTicket" ADD CONSTRAINT "_CampaignToTicket_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignToTicket" ADD CONSTRAINT "_CampaignToTicket_B_fkey" FOREIGN KEY ("B") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AudiencesToCampaign" ADD CONSTRAINT "_AudiencesToCampaign_A_fkey" FOREIGN KEY ("A") REFERENCES "Audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AudiencesToCampaign" ADD CONSTRAINT "_AudiencesToCampaign_B_fkey" FOREIGN KEY ("B") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AudienceUserToAudiences" ADD CONSTRAINT "_AudienceUserToAudiences_A_fkey" FOREIGN KEY ("A") REFERENCES "AudienceUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AudienceUserToAudiences" ADD CONSTRAINT "_AudienceUserToAudiences_B_fkey" FOREIGN KEY ("B") REFERENCES "Audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AudienceUserToCampaignDistribution" ADD CONSTRAINT "_AudienceUserToCampaignDistribution_A_fkey" FOREIGN KEY ("A") REFERENCES "AudienceUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AudienceUserToCampaignDistribution" ADD CONSTRAINT "_AudienceUserToCampaignDistribution_B_fkey" FOREIGN KEY ("B") REFERENCES "CampaignDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
