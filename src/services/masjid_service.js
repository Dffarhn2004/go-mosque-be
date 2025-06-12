const CustomError = require("../utils/custom_error");
const prisma = require("../utils/prisma_client");
const {
  FBuploadFiles,
  FBdeleteAllFilesInPath,
} = require("../utils/upload_service");

// async function getMasjidById(id, userId) {
//   return await prisma.masjid.findUnique({
//     where: {
//       id: id,
//       users: {
//         some: {
//           id: userId, // Ensure the user is associated with the masjid
//         },
//       },
//     },
//     include: {
//       fasilitasMasjid: true,
//       kegiatanMasjid: true,
//       pengeluaran_donasi_masjid: true,
//     },
//   });
// }
async function getMasjidById(id) {
  try {
    const masjid = await prisma.masjid.findUnique({
      where: { id },
      include: {
        fasilitasMasjid: true,
        kegiatanMasjid: true,
        pengeluaran_donasi_masjid: true,
        laporanMasjid: true,
      },
    });

    if (!masjid) throw new Error("Masjid not found");

    // Filter laporanMasjid agar hanya ambil jenis unik dengan uploadedAt terbaru
    const latestLaporanMap = new Map();

    for (const laporan of masjid.laporanMasjid) {
      const existing = latestLaporanMap.get(laporan.jenis);
      if (
        !existing ||
        new Date(laporan.uploadedAt) > new Date(existing.uploadedAt)
      ) {
        latestLaporanMap.set(laporan.jenis, laporan);
      }
    }

    return {
      ...masjid,
      laporanMasjid: Array.from(latestLaporanMap.values()),
    };
  } catch (error) {
    console.error("Error fetching masjid by ID:", error);
    throw new Error("Masjid not found");
  }
}

// Update masjid by ID
async function updateMasjid(idMasjid, data) {
  try {
    const masjid = await prisma.masjid.findUnique({
      where: { id: idMasjid },
    });

    if (!masjid) {
      throw new CustomError("Masjid not found", 404);
    }

    return await prisma.masjid.update({
      where: { id: idMasjid },
      data,
    });
  } catch (error) {
    console.error("Error updating masjid:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Update failed");
  }
}

async function updateMasjidFull(idMasjid, p, fileFields) {
  try {
    // 1. Check masjid exists
    const existing = await prisma.masjid.findUnique({
      where: { id: idMasjid },
    });
    if (!existing) throw new CustomError("Masjid not found", 404);

    if (fileFields.FotoLuarMasjid && Array.isArray(fileFields.FotoLuarMasjid)) {
      await FBdeleteAllFilesInPath(`masjid/${idMasjid}/FotoLuarMasjid`);
      const uploadedFiles = await FBuploadFiles(
        fileFields.FotoLuarMasjid,
        `masjid/${idMasjid}/FotoLuarMasjid`
      );
      p.FotoLuarMasjid = uploadedFiles.map((file) => file.url);
    }

    if (
      fileFields.FotoDalamMasjid &&
      Array.isArray(fileFields.FotoDalamMasjid)
    ) {
      await FBdeleteAllFilesInPath(`masjid/${idMasjid}/FotoDalamMasjid`);
      const uploadedFiles = await FBuploadFiles(
        fileFields.FotoDalamMasjid,
        `masjid/${idMasjid}/FotoDalamMasjid`
      );
      p.FotoDalamMasjid = uploadedFiles.map((file) => file.url);
    }

    // Handle single files
    if (fileFields.SuratIzinMasjid) {
      await FBdeleteAllFilesInPath(`masjid/${idMasjid}/SuratIzinMasjid`);
      const uploaded = await FBuploadFiles(
        [fileFields.SuratIzinMasjid],
        `masjid/${idMasjid}/SuratIzinMasjid`
      );
      p.SuratIzinMasjid = uploaded[0]?.url;
    }

    if (fileFields.SuratPengantar) {
      await FBdeleteAllFilesInPath(`masjid/${idMasjid}/SuratPengantar`);
      const uploaded = await FBuploadFiles(
        [fileFields.SuratPengantar],
        `masjid/${idMasjid}/SuratPengantar`
      );
      p.SuratPengantar = uploaded[0]?.url;
    }
    if (fileFields.PenghargaanMasjid) {
      await FBdeleteAllFilesInPath(`masjid/${idMasjid}/PenghargaanMasjid`);
      const uploaded = await FBuploadFiles(
        [fileFields.PenghargaanMasjid],
        `masjid/${idMasjid}/PenghargaanMasjid`
      );
      p.PenghargaanMasjid = [uploaded[0]?.url];
    }

    console.log("Payload after file upload:", p);

    // 3. Transaction
    return await prisma.$transaction(async (tx) => {
      await tx.masjid.update({
        where: { id: idMasjid },
        data: {
          ...(p.Nama && { Nama: p.Nama }),
          ...(p.Alamat && { Alamat: p.Alamat }),
          ...(p.NomorTelepon && { NomorTelepon: p.NomorTelepon }),
          ...(p.TanggalBerdiri && {
            TanggalBerdiri: new Date(p.TanggalBerdiri),
          }),
          ...(p.StatusKepemilikan && {
            StatusKepemilikan: p.StatusKepemilikan,
          }),
          ...(p.LuasTanah && { LuasTanah: p.LuasTanah }),
          ...(p.Kapasitas_Jamaah && { Kapasitas_Jamaah: p.Kapasitas_Jamaah }),
          ...(p.Deskripsi && { Deskripsi: p.Deskripsi }),
          ...(p.Visi && { Visi: p.Visi }),
          ...(p.Misi && { Misi: p.Misi }),
          ...(p.FotoLuarMasjid && { FotoLuarMasjid: p.FotoLuarMasjid }),
          ...(p.FotoDalamMasjid && { FotoDalamMasjid: p.FotoDalamMasjid }),
          ...(p.SuratIzinMasjid && { SuratIzinMasjid: p.SuratIzinMasjid }),
          ...(p.SuratPengantar && { SuratPengantar: p.SuratPengantar }),
          ...(p.PenghargaanMasjid && {
            PenghargaanMasjid: p.PenghargaanMasjid,
          }),
        },
      });

      // Kegiatan & dokumentasi
      // Kegiatan & dokumentasi
      if (p.kegiatanMasjid) {
        await tx.kegiatan_Masjid.deleteMany({ where: { masjidId: idMasjid } });

        for (const keg of p.kegiatanMasjid) {
          await tx.kegiatan_Masjid.create({
            data: {
              Nama: keg.nama,
              Dokumentasi: keg.dokumentasiUrls ?? [], // assign array directly here
              masjid: { connect: { id: idMasjid } },
            },
          });
        }
      }

      // Fasilitas
      if (p.fasilitasMasjid) {
        // Delete existing facilities
        await tx.fasilitas_Masjid.deleteMany({ where: { masjidId: idMasjid } });

        // Create new facilities
        await tx.fasilitas_Masjid.createMany({
          data: p.fasilitasMasjid.map((f) => ({
            Nama: f.Nama, // Sesuai dengan schema (huruf besar)
            Kondisi: f.Kondisi, // Sesuai dengan schema (huruf besar)
            masjidId: idMasjid,
          })),
        });
      }

      return tx.masjid.findUnique({
        where: { id: idMasjid },
        include: {
          kegiatanMasjid: true,
          fasilitasMasjid: true,
        },
      });
    });
  } catch (error) {
    console.error("Error updating masjid:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Update failed");
  }
}

module.exports = {
  getMasjidById,
  updateMasjid,
  updateMasjidFull,
};
