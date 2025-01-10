-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('INCOME', 'EXPENSE');

-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "type" "InteractionType" NOT NULL DEFAULT 'EXPENSE',
ADD COLUMN     "value" TEXT,
ALTER COLUMN "method" DROP NOT NULL,
ALTER COLUMN "txHash" DROP NOT NULL,
ALTER COLUMN "gasWeiPrice" DROP NOT NULL,
ALTER COLUMN "gasUsdPrice" DROP NOT NULL;
