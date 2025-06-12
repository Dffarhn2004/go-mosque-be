/*
  Warnings:

  - You are about to drop the column `periode` on the `Laporan_Keuangan_Masjid` table. All the data in the column will be lost.
  - You are about to drop the column `tahun` on the `Laporan_Keuangan_Masjid` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Laporan_Keuangan_Masjid" DROP COLUMN "periode",
DROP COLUMN "tahun";
