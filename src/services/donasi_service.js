const { convertImagesToWebP } = require("../utils/convert_image_to_webp");
const prisma = require("../utils/prisma_client");
const { FBuploadFiles } = require("../utils/upload_service");
const { Decimal } = require("@prisma/client/runtime/library.js");

async function getAllDonasi(idUser) {
  console.log("Fetching all donations for user:", idUser);

  return await prisma.donasi.findMany({
    where: {
      id_user: idUser, // Filter by userId
    },

    include: {
      donasi_masjid: {
        include: {
          masjid: true, // Include related Masjid data
          // pengeluaran_donasi_masjid: true, // Include related pengeluaran_donasi_masjid data
          kategori_donasi: true,
        },
      },
      user: true, // Include related User data
    },
  });
}

async function getAllDonaturTakmir(idUser) {
  console.log("Fetching all donations for user:", idUser);

  return await prisma.donasi.findMany({
    where: {
      donasi_masjid:{
        masjid:{
          users: {
            some: {
              id: idUser, // Filter by userId
            },
          },
        }
      }

    },

    include: {
      donasi_masjid:true, // Include related Donasi Masjid data
      // user: true, // Include related User data
    },
  });
}

async function getDonasi(idDonasi, idUser) {
  return await prisma.donasi.findUnique({
    where: {
      id_user: idUser, // Filter by userId
      id: idDonasi, // Filter by donasiId
    },

    include: {
      donasi_masjid: {
        include: {
          masjid: true, // Include related Masjid data
          pengeluaran_donasi_masjid: true, // Include related pengeluaran_donasi_masjid data
          kategori_donasi: true,
        },
      },
    },
  });
}

async function createDonasi(data) {
  const donationAmount = new Decimal(data.JumlahDonasi);

  return await prisma.$transaction(async (tx) => {
    const targetDonasiMasjid = await tx.donasi_Masjid.findUnique({
      where: { id: data.id_donasi_masjid },
    });

    if (!targetDonasiMasjid) {
      throw new Error("Donasi masjid tidak ditemukan");
    }

    const createdDonasi = await tx.donasi.create({
      data: {
        ...data,
        JumlahDonasi: donationAmount,
      },
    });

    if (data.StatusDonasi === "Sukses") {
      await tx.donasi_Masjid.update({
        where: { id: data.id_donasi_masjid },
        data: {
          UangDonasiTerkumpul: {
            increment: donationAmount,
          },
        },
      });
    }

    return createdDonasi;
  });
}

module.exports = {
  getAllDonaturTakmir,
  getAllDonasi,
  getDonasi,
  createDonasi,
};
