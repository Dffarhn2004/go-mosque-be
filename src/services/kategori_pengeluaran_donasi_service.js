const prisma = require("../utils/prisma_client");


async function getAllKategoriPengeluaranDonasi() {
    return await prisma.kategori_Pengeluaran.findMany({
        where: { isActive: true },
        orderBy: { Nama: "asc" },
    });
}

async function createKategoriPengeluaranDonasi(data) {
    // data should contain the fields required to create a role, e.g. { name: 'Admin' }
    return await prisma.kategori_Pengeluaran.create({
        data: {
            Nama: data,
            // Add other fields if necessary
        }
    });
}

module.exports = {
    getAllKategoriPengeluaranDonasi,
    createKategoriPengeluaranDonasi,
};
