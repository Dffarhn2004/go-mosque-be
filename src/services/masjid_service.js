const CustomError = require("../utils/custom_error");
const prisma = require("../utils/prisma_client");
const {
  FBuploadFiles,
  FBdeleteAllFilesInPath,
} = require("../utils/upload_service");

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
          ...(p.isOpenForGeneralDonation !== undefined && {
            isOpenForGeneralDonation:
              String(p.isOpenForGeneralDonation) === "true" ||
              p.isOpenForGeneralDonation === true,
          }),
          ...(p.GeneralDonationTitle !== undefined && {
            GeneralDonationTitle: p.GeneralDonationTitle || null,
          }),
          ...(p.GeneralDonationDescription !== undefined && {
            GeneralDonationDescription: p.GeneralDonationDescription || null,
          }),
          ...(p.GeneralDonationImage !== undefined && {
            GeneralDonationImage: p.GeneralDonationImage || null,
          }),
          ...(p.TanggalBerdiri && {
            TanggalBerdiri: new Date(p.TanggalBerdiri),
          }),
          ...(p.StatusKepemilikan && {
            StatusKepemilikan: p.StatusKepemilikan,
          }),
          ...(p.LuasTanah &&
            !isNaN(parseFloat(p.LuasTanah)) && {
              LuasTanah: parseFloat(p.LuasTanah),
            }),
          ...(p.Kapasitas_Jamaah && {
            Kapasitas_Jamaah: parseInt(p.Kapasitas_Jamaah),
          }),
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

// Get list of masjid with pagination and search
async function getMasjidList(options = {}) {
  try {
    const { limit, offset = 0, search, generalDonationOnly = false } = options;

    // Build where clause for search
    const whereClause = { isActive: true };
    if (search) {
      whereClause.OR = [
        { Nama: { contains: search, mode: "insensitive" } },
        { Deskripsi: { contains: search, mode: "insensitive" } },
        { Alamat: { contains: search, mode: "insensitive" } },
      ];
    }

    if (generalDonationOnly) {
      whereClause.isOpenForGeneralDonation = true;
    }

    // Get total count for pagination
    const total = await prisma.masjid.count({ where: whereClause });

    // Build query options
    const queryOptions = {
      where: whereClause,
      orderBy: { id: "desc" }, // Order by id descending (newest first)
      select: {
        id: true,
        Nama: true,
        Deskripsi: true,
        Alamat: true,
        NomorTelepon: true,
        FotoLuarMasjid: true,
        isOpenForGeneralDonation: true,
        GeneralDonationTitle: true,
        GeneralDonationDescription: true,
        GeneralDonationImage: true,
      },
    };

    // Add pagination if limit is provided
    if (limit) {
      queryOptions.take = parseInt(limit);
      queryOptions.skip = parseInt(offset);
    }

    // Fetch masjid data
    const masjidList = await prisma.masjid.findMany(queryOptions);

    // Transform data to match API documentation format
    const transformedData = masjidList.map((masjid) => ({
      id: masjid.id,
      Nama: masjid.Nama,
      Deskripsi: masjid.Deskripsi || null,
      Alamat: masjid.Alamat,
      FotoMasjid: masjid.FotoLuarMasjid && masjid.FotoLuarMasjid.length > 0
        ? masjid.FotoLuarMasjid[0]
        : null,
      isOpenForGeneralDonation: masjid.isOpenForGeneralDonation,
      GeneralDonationTitle: masjid.GeneralDonationTitle || null,
      GeneralDonationDescription: masjid.GeneralDonationDescription || null,
      GeneralDonationImage: masjid.GeneralDonationImage || null,
      NoTelepon: masjid.NomorTelepon || null,
      Email: null, // Not in schema
      Website: null, // Not in schema
      Latitude: null, // Not in schema
      Longitude: null, // Not in schema
      CreatedAt: null, // Not in schema
      UpdatedAt: null, // Not in schema
    }));

    // Calculate pagination info
    const limitNum = limit ? parseInt(limit) : total;
    const offsetNum = parseInt(offset);
    const totalPages = limit && limitNum > 0 ? Math.ceil(total / limitNum) : 1;
    const currentPage = limit && limitNum > 0 ? Math.floor(offsetNum / limitNum) + 1 : 1;

    return {
      data: transformedData,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        totalPages,
        currentPage,
      },
    };
  } catch (error) {
    console.error("Error fetching masjid list:", error);
    throw new Error("Gagal memuat data masjid");
  }
}

module.exports = {
  getMasjidById,
  updateMasjid,
  updateMasjidFull,
  getMasjidList,
};
