/*
  Warnings:

  - Added the required column `gasUsdPrice` to the `Interaction` table without a default value. This is not possible if the table is not empty.
  - Made the column `developerId` on table `Interaction` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- AlterEnum
ALTER TYPE "SmartContractOperatorType" ADD VALUE 'irys';

-- DropForeignKey
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_developerId_fkey";

-- AlterTable
ALTER TABLE "App" ADD COLUMN     "colors" JSONB;

-- AlterTable
ALTER TABLE "Developer" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN     "gasUsdPrice" TEXT NOT NULL,
ALTER COLUMN "developerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
