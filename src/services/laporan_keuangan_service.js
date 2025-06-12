const prisma = require("../utils/prisma_client");
const { FBuploadFiles } = require("../utils/upload_service");

async function uploadLaporanKeuanganMasjid({ idMasjid, type, file }) {
  if (!file) throw new Error("No file uploaded");

  // Upload to Firebase Storage
  const [uploadedFile] = await FBuploadFiles(
    [file],
    `masjid/${idMasjid}/laporan-keuangan/${type}`
  );

  // Save metadata to database
  const created = await prisma.laporanKeuanganMasjid.create({
    data: {
      masjid: {
        connect: { id: idMasjid },
      },
      jenis: type,
      fileUrl: uploadedFile.url,
      fileSizeKB: Math.ceil(file.size / 1024),
    },
  });

  return created;
}

async function getLaporanKeuanganForDownload(id) {
  return await prisma.laporanKeuanganMasjid.findUnique({
    where: { id },
  });
}

module.exports = {
  uploadLaporanKeuanganMasjid,
  getLaporanKeuanganForDownload,
};
