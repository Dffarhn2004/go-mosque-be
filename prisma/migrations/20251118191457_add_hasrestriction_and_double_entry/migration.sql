/*
  Warnings:

  - You are about to drop the `Jurnal` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Jurnal" DROP CONSTRAINT "Jurnal_akunId_fkey";

-- DropForeignKey
ALTER TABLE "Jurnal" DROP CONSTRAINT "Jurnal_masjidId_fkey";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "hasRestriction" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Jurnal";

-- CreateTable
CREATE TABLE "JurnalTransaction" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "keterangan" TEXT NOT NULL,
    "referensi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JurnalTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurnalEntry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "akunId" TEXT NOT NULL,
    "tipe" "JurnalTipe" NOT NULL,
    "jumlah" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JurnalEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JurnalTransaction" ADD CONSTRAINT "JurnalTransaction_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalEntry" ADD CONSTRAINT "JurnalEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "JurnalTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalEntry" ADD CONSTRAINT "JurnalEntry_akunId_fkey" FOREIGN KEY ("akunId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
