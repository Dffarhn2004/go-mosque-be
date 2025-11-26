/*
  Warnings:

  - Changed the type of `normalBalance` on the `Account` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "normalBalance",
ADD COLUMN     "normalBalance" "NormalBalance" NOT NULL;
