-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "timezoneIdentifier" TEXT;

-- CreateTable
CREATE TABLE "EventLocation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "street1stLine" TEXT,
    "street2ndLine" TEXT,
    "postalCode" TEXT,
    "city" TEXT NOT NULL,
    "countryCode" TEXT,
    "country" TEXT NOT NULL,
    "locationDetails" TEXT,
    "continent" TEXT,
    "stateCode" TEXT,
    "countryLatitude" TEXT,
    "countryLongitude" TEXT,
    "cityLatitude" TEXT,
    "cityLongitude" TEXT,
    "countryFlag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventLocation_eventId_key" ON "EventLocation"("eventId");

-- AddForeignKey
ALTER TABLE "EventLocation" ADD CONSTRAINT "EventLocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
