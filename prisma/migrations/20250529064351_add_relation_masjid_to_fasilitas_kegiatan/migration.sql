/*
  Warnings:

  - You are about to drop the column `fasilitasMasjid` on the `Masjid` table. All the data in the column will be lost.
  - You are about to drop the column `kegiatanMasjid` on the `Masjid` table. All the data in the column will be lost.
  - Added the required column `masjidId` to the `Fasilitas_Masjid` table without a default value. This is not possible if the table is not empty.
  - Added the required column `masjidId` to the `Kegiatan_Masjid` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Fasilitas_Masjid" ADD COLUMN     "masjidId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Kegiatan_Masjid" ADD COLUMN     "masjidId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Masjid" DROP COLUMN "fasilitasMasjid",
DROP COLUMN "kegiatanMasjid";

-- AddForeignKey
ALTER TABLE "Fasilitas_Masjid" ADD CONSTRAINT "Fasilitas_Masjid_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kegiatan_Masjid" ADD CONSTRAINT "Kegiatan_Masjid_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
