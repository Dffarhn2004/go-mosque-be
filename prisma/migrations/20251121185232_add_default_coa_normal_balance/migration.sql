-- CreateEnum
CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'KREDIT');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "normalBalance" TEXT NOT NULL DEFAULT 'DEBIT';
