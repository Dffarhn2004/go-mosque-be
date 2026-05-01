const { PrismaClient } = require("../generated/prisma_runtime");
const prisma = new PrismaClient();

async function getAllStatistik(idMasjid) {
  // 1. Get all Donasi_Masjid ID by this Masjid
  const donasiMasjidList = await prisma.donasi_Masjid.findMany({
    where: { id_masjid: idMasjid },
    select: { id: true },
  });

  const donasiMasjidIds = donasiMasjidList.map((d) => d.id);

  // 2. Total Kas Masuk: Semua donasi sukses dari donasi_masjid tsb
  const cashIn = await prisma.donasi.aggregate({
    where: {
      StatusDonasi: "Sukses",
      OR: [
        { masjidId: idMasjid },
        { id_donasi_masjid: { in: donasiMasjidIds } },
      ],
    },
    _sum: {
      JumlahDonasi: true,
    },
    _count: true,
  });

  // 3. Total Kas Keluar: Pengeluaran dari semua donasi_masjid tersebut
  const cashOut = await prisma.pengeluaran_Donasi_Masjid.aggregate({
    where: {
      id_donasi_masjid: { in: donasiMasjidIds },
    },
    _sum: {
      UangPengeluaran: true,
    },
    _count: true,
  });

  const generalDonations = await prisma.donasi.aggregate({
    where: {
      masjidId: idMasjid,
      DonationChannel: "GENERAL",
      StatusDonasi: "Sukses",
    },
    _sum: {
      JumlahDonasi: true,
    },
    _count: true,
  });

  const campaignDonations = await prisma.donasi.aggregate({
    where: {
      id_donasi_masjid: { in: donasiMasjidIds },
      StatusDonasi: "Sukses",
    },
    _sum: {
      JumlahDonasi: true,
    },
    _count: true,
  });

  return {
    cashIn: {
      total: Number(cashIn._sum.JumlahDonasi || 0),
      count: cashIn._count,
    },
    cashOut: {
      total: Number(cashOut._sum.UangPengeluaran || 0),
      count: cashOut._count,
    },
    transactions: {
      total: cashIn._count + cashOut._count,
    },
    generalDonations: {
      total: Number(generalDonations._sum.JumlahDonasi || 0),
      count: generalDonations._count,
    },
    campaignDonations: {
      total: Number(campaignDonations._sum.JumlahDonasi || 0),
      count: campaignDonations._count,
    },
  };
}

module.exports = {
  getAllStatistik,
};
