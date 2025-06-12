/*
  Warnings:

  - You are about to drop the column `PenghargaanMasjjid` on the `Masjid` table. All the data in the column will be lost.
  - The `StatusKepemilikan` column on the `Masjid` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "StatusKepemilikan" AS ENUM ('MILIK_SENDIRI', 'TANAH_WAFKAH', 'HIBAH', 'SEWA');

-- AlterTable
ALTER TABLE "Masjid" DROP COLUMN "PenghargaanMasjjid",
ADD COLUMN     "PenghargaanMasjid" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "StatusKepemilikan",
ADD COLUMN     "StatusKepemilikan" "StatusKepemilikan";
