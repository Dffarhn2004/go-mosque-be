-- CreateEnum
CREATE TYPE "AccountRestriction" AS ENUM ('TANPA_PEMBATASAN', 'DENGAN_PEMBATASAN');

-- CreateEnum
CREATE TYPE "AccountReport" AS ENUM ('NERACA', 'LAPORAN_PENGHASILAN_KOMPREHENSIF');

-- CreateEnum
CREATE TYPE "AccountCategory" AS ENUM ('ASET_LANCAR', 'ASET_TIDAK_LANCAR', 'HUTANG_JANGKA_PENDEK', 'HUTANG_JANGKA_PANJANG', 'ASET_NETO', 'PENDAPATAN', 'BEBAN', 'PENGHASILAN_KOMPREHENSIF_LAIN');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "category" "AccountCategory",
ADD COLUMN     "report" "AccountReport",
ADD COLUMN     "restriction" "AccountRestriction";
