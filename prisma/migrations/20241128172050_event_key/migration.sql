-- CreateTable
CREATE TABLE "EventKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventKey_eventId_key" ON "EventKey"("eventId");

-- AddForeignKey
ALTER TABLE "EventKey" ADD CONSTRAINT "EventKey_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
