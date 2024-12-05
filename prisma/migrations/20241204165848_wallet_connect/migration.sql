/*
  Warnings:

  - A unique constraint covering the columns `[connectedWalletAddress]` on the table `Developer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Developer" ADD COLUMN     "connectedWalletAddress" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Developer_connectedWalletAddress_key" ON "Developer"("connectedWalletAddress");
