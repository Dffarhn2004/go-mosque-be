/*
  Warnings:

  - You are about to drop the column `hasRestriction` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "hasRestriction";

-- AlterTable
ALTER TABLE "JurnalEntry" ADD COLUMN     "hasRestriction" BOOLEAN NOT NULL DEFAULT false;
