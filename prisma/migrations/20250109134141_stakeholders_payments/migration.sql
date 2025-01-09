/*
  Warnings:

  - You are about to drop the column `paymentDistributionMethod` on the `Stakeholder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Stakeholder" DROP COLUMN "paymentDistributionMethod",
ADD COLUMN     "paymentMethods" "PaymentMethod"[] DEFAULT ARRAY[]::"PaymentMethod"[];

-- DropEnum
DROP TYPE "StakeholderPaymentDistributionMethod";
