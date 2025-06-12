-- CreateEnum
CREATE TYPE "KondisiFasilitas" AS ENUM ('KURANG_BAIK', 'CUKUP_BAIK', 'BAIK', 'BAIK_SEKALI', 'SANGAT_BAIK');

-- CreateEnum
CREATE TYPE "StatusDonasi" AS ENUM ('Pending', 'Sukses');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "NamaLengkap" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "Password" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "roleId" TEXT NOT NULL,
    "masjidId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "Nama" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Masjid" (
    "id" TEXT NOT NULL,
    "Nama" TEXT NOT NULL,
    "Alamat" TEXT NOT NULL,
    "NomorTelepon" TEXT NOT NULL,
    "TanggalBerdiri" TIMESTAMP(3) NOT NULL,
    "StatusKepemilikan" TEXT NOT NULL,
    "LuasTanah" DOUBLE PRECISION NOT NULL,
    "Kapasitas_Jamaah" INTEGER NOT NULL,
    "Deskripsi" TEXT,
    "Visi" TEXT,
    "Misi" TEXT,
    "FotoLuarMasjid" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "FotoDalamMasjid" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "SuratIzinMasjid" TEXT,
    "PenghargaanMasjjid" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "SuratPengantar" TEXT,
    "fasilitasMasjid" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kegiatanMasjid" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Masjid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fasilitas_Masjid" (
    "id" TEXT NOT NULL,
    "Nama" TEXT NOT NULL,
    "Kondisi" "KondisiFasilitas" NOT NULL,

    CONSTRAINT "Fasilitas_Masjid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kegiatan_Masjid" (
    "id" TEXT NOT NULL,
    "Nama" TEXT NOT NULL,
    "Dokumentasi" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Kegiatan_Masjid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kategori_Donasi" (
    "id" TEXT NOT NULL,
    "Nama" TEXT NOT NULL,

    CONSTRAINT "Kategori_Donasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kategori_Pengeluaran" (
    "id" TEXT NOT NULL,
    "Nama" TEXT NOT NULL,

    CONSTRAINT "Kategori_Pengeluaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donasi" (
    "id" TEXT NOT NULL,
    "Nama" TEXT NOT NULL,
    "Keterangan" TEXT,
    "JumlahDonasi" DECIMAL(15,2) NOT NULL,
    "StatusDonasi" "StatusDonasi" NOT NULL DEFAULT 'Pending',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_donasi_masjid" TEXT NOT NULL,
    "id_user" TEXT NOT NULL,

    CONSTRAINT "Donasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donasi_Masjid" (
    "id" TEXT NOT NULL,
    "Nama" TEXT NOT NULL,
    "Deskripsi" TEXT,
    "TargetUangDonasi" DECIMAL(15,2) NOT NULL,
    "UangDonasiTerkumpul" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "UangPengeluaran" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "id_masjid" TEXT NOT NULL,
    "id_kategori_donasi" TEXT NOT NULL,

    CONSTRAINT "Donasi_Masjid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengeluaran_Donasi_Masjid" (
    "id" TEXT NOT NULL,
    "TujuanPengeluaran" TEXT NOT NULL,
    "DeskripsiPengeluaran" TEXT,
    "UangPengeluaran" DECIMAL(15,2) NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_donasi_masjid" TEXT NOT NULL,
    "id_kategori_pengeluaran" TEXT NOT NULL,
    "masjidId" TEXT,
    "kategori_DonasiId" TEXT,

    CONSTRAINT "Pengeluaran_Donasi_Masjid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_Email_key" ON "User"("Email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donasi" ADD CONSTRAINT "Donasi_id_donasi_masjid_fkey" FOREIGN KEY ("id_donasi_masjid") REFERENCES "Donasi_Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donasi" ADD CONSTRAINT "Donasi_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donasi_Masjid" ADD CONSTRAINT "Donasi_Masjid_id_masjid_fkey" FOREIGN KEY ("id_masjid") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donasi_Masjid" ADD CONSTRAINT "Donasi_Masjid_id_kategori_donasi_fkey" FOREIGN KEY ("id_kategori_donasi") REFERENCES "Kategori_Donasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengeluaran_Donasi_Masjid" ADD CONSTRAINT "Pengeluaran_Donasi_Masjid_id_donasi_masjid_fkey" FOREIGN KEY ("id_donasi_masjid") REFERENCES "Donasi_Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengeluaran_Donasi_Masjid" ADD CONSTRAINT "Pengeluaran_Donasi_Masjid_id_kategori_pengeluaran_fkey" FOREIGN KEY ("id_kategori_pengeluaran") REFERENCES "Kategori_Pengeluaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengeluaran_Donasi_Masjid" ADD CONSTRAINT "Pengeluaran_Donasi_Masjid_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengeluaran_Donasi_Masjid" ADD CONSTRAINT "Pengeluaran_Donasi_Masjid_kategori_DonasiId_fkey" FOREIGN KEY ("kategori_DonasiId") REFERENCES "Kategori_Donasi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
