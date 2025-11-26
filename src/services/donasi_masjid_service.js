const { Prisma } = require("@prisma/client");
const { get } = require("../routes/masjid_router");
const { convertImagesToWebP } = require("../utils/convert_image_to_webp");
const prisma = require("../utils/prisma_client");
const { FBuploadFiles } = require("../utils/upload_service");
const { Decimal } = require("@prisma/client/runtime/library.js");

async function getAllDonasiMasjid(idMasjid, limit) {
  const query = {
    where: {
      id_masjid: idMasjid, // Filter by masjidId
    },
    include: {
      masjid: true, // Include related Masjid data
      pengeluaran_donasi_masjid: true, // Include related pengeluaran_donasi_masjid data
      kategori_donasi: true,
      donasi: {
        select: {
          id: true,
        },
      },
    },
    orderBy: { CreatedAt: "desc" },
  };

  if (limit) {
    query.take = limit; // Limit the number of results if limit is provided
  }

  return await prisma.donasi_Masjid.findMany(query);
}

//get all donasi masjid for user
async function getAllDonasiMasjidUser(limit) {
  return await prisma.donasi_Masjid.findMany({
    include: {
      masjid: true, // Include related Masjid data
      pengeluaran_donasi_masjid: true, // Include related pengeluaran_donasi_masjid data
      kategori_donasi: true,
    },
    orderBy: { CreatedAt: "desc" },
    // orderBy: Prisma.sql`RANDOM()`, // Randomize the order of results
    take: limit, // Limit the number of results if limit is provided
  });
}

async function getDonasiMasjidUser(idDonasiMasjid) {
  return await prisma.donasi_Masjid.findUnique({
    where: {
      id: idDonasiMasjid, // Filter by masjidId
    },
    include: {
      masjid: true, // Include related Masjid data
      pengeluaran_donasi_masjid: {
        include: {
          kategori_pengeluaran: true, // Include related Kategori Pengeluaran data
        },
      }, // Include related pengeluaran_donasi_masjid data
      kategori_donasi: true,
    },
  });
}

async function getDonasiMasjid(idDonasiMasjid, idMasjid) {
  return await prisma.donasi_Masjid.findUnique({
    where: {
      id: idDonasiMasjid, // Filter by masjidId
      id_masjid: idMasjid, // Filter by masjidId
    },
    include: {
      masjid: true, // Include related Masjid data
      pengeluaran_donasi_masjid: {
        include: {
          kategori_pengeluaran: true, // Include related Kategori Pengeluaran data
        },
      }, // Include related pengeluaran_donasi_masjid data
      kategori_donasi: true,
      donasi: true,
    },
  });
}

async function createDonasiMasjid(data, foto) {
  // Step 1: Create donasi first (without thumbnail)
  const createdDonasi = await prisma.donasi_Masjid.create({
    data: {
      Nama: data.Nama,
      Deskripsi: data.Deskripsi,
      TargetUangDonasi: new Decimal(data.TargetUangDonasi),
      UangDonasiTerkumpul: new Decimal(data.UangDonasiTerkumpul || 0),
      id_masjid: data.id_masjid,
      id_kategori_donasi: data.id_kategori_donasi,
    },
  });

  // Step 2: Convert and upload thumbnail if exists
  if (foto && foto.mimetype?.startsWith("image/")) {
    const [webpFile] = await convertImagesToWebP([foto]);

    const uploadedFile = await FBuploadFiles(
      [webpFile],
      `donasi/${createdDonasi.id}/thumbnail`
    );

    // Step 3: Update donasi with thumbnail URL
    await prisma.donasi_Masjid.update({
      where: { id: createdDonasi.id },
      data: {
        FotoDonasi: uploadedFile[0].url,
      },
    });

    createdDonasi.FotoDonasi = uploadedFile[0].url;
  }

  return createdDonasi;
}

module.exports = {
  getAllDonasiMasjid,
  getDonasiMasjid,
  createDonasiMasjid,
  getAllDonasiMasjidUser,
  getDonasiMasjidUser,
};
