const { get } = require("../routes/masjid_router");
const { convertImagesToWebP } = require("../utils/convert_image_to_webp");
const CustomError = require("../utils/custom_error");
const prisma = require("../utils/prisma_client");
const { FBuploadFiles } = require("../utils/upload_service");
const { Decimal } = require("@prisma/client/runtime/library.js");

async function getAllPengeluaranDonasiMasjid(idDonasiMasjid) {
  return await prisma.pengeluaran_Donasi_Masjid.findMany({
    where: {
      id_donasi_masjid: idDonasiMasjid, // Filter by donasiMasjidId
    },
    include: {
      Masjid: true, // Include related Masjid data
      Kategori_Donasi: true, // Include related Kategori Donasi data
      donasi_masjid: true, // Include related Donasi Masjid data
    },
  });
}

// async function getDonasiMasjid(idDonasiMasjid) {
//   return await prisma.donasi_Masjid.findUnique({
//     where: {
//       id: idDonasiMasjid, // Filter by masjidId
//     },
//     include: {
//       masjid: true, // Include related Masjid data
//       pengeluaran_donasi_masjid: true, // Include related pengeluaran_donasi_masjid data
//       kategori_donasi: true,
//     },
//   });
// }

async function createPengeluaranDonasiMasjid(data, foto) {
  try {
    //validasi pengeluaran tidak boleh lebih besar dari donasi
    const donasiMasjid = await prisma.donasi_Masjid.findUnique({
      where: { id: data.id_donasi_masjid },
    });

    if (!donasiMasjid) {
      throw new CustomError("Donasi Masjid not found", 404);
    }
    if (
      new Decimal(data.UangPengeluaran).greaterThan(
        donasiMasjid.UangDonasiTerkumpul - donasiMasjid.UangPengeluaran
      )
    ) {
      throw new CustomError(
        "Pengeluaran tidak boleh lebih besar dari donasi",
        403
      );
    }

    // Step 1: Create donasi first (without thumbnail)
    const createdPengeluaranDonasi =
      await prisma.pengeluaran_Donasi_Masjid.create({
        data: {
          TujuanPengeluaran: data.TujuanPengeluaran,
          DeskripsiPengeluaran: data.DeskripsiPengeluaran,
          UangPengeluaran: new Decimal(data.UangPengeluaran),
          masjidId: data.masjidId,
          kategori_DonasiId: data.kategori_DonasiId,
          id_donasi_masjid: data.id_donasi_masjid,
          id_kategori_pengeluaran: data.id_kategori_pengeluaran,
        },
      });

    // Step 2: Convert and upload thumbnail if exists
    if (foto && foto.mimetype?.startsWith("image/")) {
      const [webpFile] = await convertImagesToWebP([foto]);

      const uploadedFile = await FBuploadFiles(
        [webpFile],
        `donasi/${createdPengeluaranDonasi.id}/pengeluaran`
      );

      // Step 3: Update donasi with thumbnail URL
      await prisma.pengeluaran_Donasi_Masjid.update({
        where: { id: createdPengeluaranDonasi.id },
        data: {
          FotoPengeluaran: uploadedFile[0].url,
        },
      });

      createdPengeluaranDonasi.FotoPengeluaran = uploadedFile[0].url;
    }

    return createdPengeluaranDonasi;
  } catch (error) {
    // console.error("Error during registration:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Registration failed");
  }
}

module.exports = {
  getAllPengeluaranDonasiMasjid,
  //   getDonasiMasjid,
  createPengeluaranDonasiMasjid,
};
