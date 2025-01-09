-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CRYPTO', 'FIAT');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "paymentMethods" "PaymentMethod"[] DEFAULT ARRAY[]::"PaymentMethod"[];
