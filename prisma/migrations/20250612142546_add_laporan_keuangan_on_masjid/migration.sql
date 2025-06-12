-- CreateEnum
CREATE TYPE "JenisLaporanKeuangan" AS ENUM ('POSISI_KEUANGAN', 'PENGHASILAN_KOMP', 'PERUBAHAN_ASET_NETO', 'ARUS_KAS', 'CATATAN');

-- CreateTable
CREATE TABLE "Laporan_Keuangan_Masjid" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "jenis" "JenisLaporanKeuangan" NOT NULL,
    "tahun" INTEGER NOT NULL,
    "periode" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileSizeKB" INTEGER NOT NULL,

    CONSTRAINT "Laporan_Keuangan_Masjid_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Laporan_Keuangan_Masjid" ADD CONSTRAINT "Laporan_Keuangan_Masjid_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
