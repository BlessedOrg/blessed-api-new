/*
  Warnings:

  - You are about to drop the column `fees` on the `Interaction` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Interaction` table. All the data in the column will be lost.
  - Added the required column `gasWeiPrice` to the `Interaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operatorType` to the `Interaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SmartContractOperatorType" AS ENUM ('biconomy', 'operator');

-- DropForeignKey
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_userId_fkey";

-- AlterTable
ALTER TABLE "Interaction" DROP COLUMN "fees",
DROP COLUMN "type",
ADD COLUMN     "developerId" TEXT,
ADD COLUMN     "gasWeiPrice" TEXT NOT NULL,
ADD COLUMN     "operatorType" "SmartContractOperatorType" NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- DropEnum
DROP TYPE "SmartContractInteractionType";

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
