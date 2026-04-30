const prisma = require("../utils/prisma_client");


async function getAllKategoriDonasi() {
    return await prisma.kategori_Donasi.findMany({
        where: { isActive: true },
        orderBy: { Nama: "asc" },
    });
}

async function createKategoriDonasi(data) {
    // data should contain the fields required to create a role, e.g. { name: 'Admin' }
    return await prisma.kategori_Donasi.create({
        data: {
            Nama: data,
            // Add other fields if necessary
        }
    });
}

module.exports = {
    getAllKategoriDonasi,
    createKategoriDonasi,
};
