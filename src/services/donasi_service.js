const { convertImagesToWebP } = require("../utils/convert_image_to_webp");
const prisma = require("../utils/prisma_client");
const { FBuploadFiles } = require("../utils/upload_service");
const { Decimal } = require("@prisma/client/runtime/library.js");
const CustomError = require("../utils/custom_error");

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
      masjid: true,
      user: true, // Include related User data
    },
    orderBy: {
      CreatedAt: "desc",
    },
  });
}

async function getAllDonaturTakmir(idUser) {
  console.log("Fetching all donations for user:", idUser);

  return await prisma.donasi.findMany({
    where: {
      OR: [
        {
          donasi_masjid: {
            masjid: {
              users: {
                some: {
                  id: idUser,
                },
              },
            },
          },
        },
        {
          masjid: {
            users: {
              some: {
                id: idUser,
              },
            },
          },
        },
      ],
    },

    include: {
      donasi_masjid: {
        include: {
          masjid: true,
          kategori_donasi: true,
        },
      },
      masjid: true,
      jurnalApprovalBy: {
        select: {
          id: true,
          NamaLengkap: true,
          Email: true,
        },
      },
      user: {
        select: {
          id: true,
          NamaLengkap: true,
          Email: true,
        },
      },
    },
    orderBy: {
      CreatedAt: "desc",
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
  const donationChannel = data.DonationChannel === "GENERAL" ? "GENERAL" : "CAMPAIGN";

  return await prisma.$transaction(async (tx) => {
    let targetDonasiMasjid = null;
    let targetMasjidId = data.masjidId || null;

    if (donationChannel === "CAMPAIGN") {
      targetDonasiMasjid = await tx.donasi_Masjid.findUnique({
        where: { id: data.id_donasi_masjid },
      });

      if (!targetDonasiMasjid) {
        throw new Error("Donasi masjid tidak ditemukan");
      }

      targetMasjidId = targetDonasiMasjid.id_masjid;
    } else {
      if (!targetMasjidId) {
        throw new Error("Masjid tujuan donasi umum wajib diisi");
      }

      const masjid = await tx.masjid.findUnique({
        where: { id: targetMasjidId },
        select: {
          id: true,
          isOpenForGeneralDonation: true,
        },
      });

      if (!masjid) {
        throw new Error("Masjid tujuan donasi tidak ditemukan");
      }

      if (!masjid.isOpenForGeneralDonation) {
        throw new Error("Masjid belum membuka donasi umum");
      }
    }

    const createdDonasi = await tx.donasi.create({
      data: {
        ...data,
        DonationChannel: donationChannel,
        JumlahDonasi: donationAmount,
        id_donasi_masjid:
          donationChannel === "CAMPAIGN" ? data.id_donasi_masjid : null,
        masjidId: targetMasjidId,
      },
    });

    if (data.StatusDonasi === "Sukses" && donationChannel === "CAMPAIGN") {
      await tx.donasi_Masjid.update({
        where: { id: data.id_donasi_masjid },
        data: {
          UangDonasiTerkumpul: {
            increment: donationAmount,
          },
        },
      });
    }

    if (data.StatusDonasi === "Sukses" && targetMasjidId) {
      const takmirUsers = await tx.user.findMany({
        where: {
          masjidId: targetMasjidId,
        },
        select: {
          id: true,
        },
      });

      if (takmirUsers.length > 0) {
        const donationTargetName =
          donationChannel === "GENERAL"
            ? "donasi umum masjid"
            : targetDonasiMasjid?.Nama || "campaign donasi";

        await tx.notification.createMany({
          data: takmirUsers.map((takmir) => ({
            userId: takmir.id,
            title: "Donasi baru masuk",
            message: `${data.Nama} berdonasi Rp${Number(donationAmount).toLocaleString(
              "id-ID"
            )} untuk ${donationTargetName}.`,
            type: "DONATION",
            entityType: "DONATION",
            entityId: createdDonasi.id,
          })),
        });
      }
    }

    return createdDonasi;
  });
}

async function updateDonasiJurnalApproval({
  donationId,
  takmirUserId,
  status,
  reason = null,
  jurnalTransactionId = null,
}) {
  if (!donationId) {
    throw new CustomError("Donation ID is required", 400);
  }

  if (!["APPROVED", "REJECTED"].includes(status)) {
    throw new CustomError("Invalid approval status", 400);
  }

  return prisma.$transaction(async (tx) => {
    const donasi = await tx.donasi.findFirst({
      where: {
        id: donationId,
        OR: [
          {
            donasi_masjid: {
              masjid: {
                users: {
                  some: {
                    id: takmirUserId,
                  },
                },
              },
            },
          },
          {
            masjid: {
              users: {
                some: {
                  id: takmirUserId,
                },
              },
            },
          },
        ],
      },
      include: {
        donasi_masjid: {
          include: {
            masjid: true,
          },
        },
        masjid: true,
      },
    });

    if (!donasi) {
      throw new CustomError("Donasi tidak ditemukan", 404);
    }

    if (donasi.StatusDonasi !== "Sukses") {
      throw new CustomError("Hanya donasi sukses yang bisa diproses", 400);
    }

    if (donasi.JurnalApprovalStatus !== "PENDING") {
      throw new CustomError("Donasi ini sudah pernah diproses", 409);
    }

    if (status === "APPROVED") {
      const reference = `DONASI:${donationId}`;
      const linkedTransaction = await tx.jurnalTransaction.findFirst({
        where: {
          masjidId: donasi.masjidId || donasi.donasi_masjid?.id_masjid,
          OR: [
            { referensi: reference },
            ...(jurnalTransactionId ? [{ id: jurnalTransactionId }] : []),
          ],
        },
        select: {
          id: true,
          referensi: true,
        },
      });

      if (!linkedTransaction) {
        throw new CustomError(
          "Jurnal untuk approval donasi ini belum ditemukan",
          400
        );
      }
    }

    const updated = await tx.donasi.update({
      where: {
        id: donationId,
      },
      data: {
        JurnalApprovalStatus: status,
        JurnalApprovalAt: new Date(),
        JurnalApprovalById: takmirUserId,
        JurnalApprovalReason: reason?.trim() || null,
      },
      include: {
        donasi_masjid: {
          include: {
            masjid: true,
            kategori_donasi: true,
          },
        },
        masjid: true,
        jurnalApprovalBy: {
          select: {
            id: true,
            NamaLengkap: true,
            Email: true,
          },
        },
        user: {
          select: {
            id: true,
            NamaLengkap: true,
            Email: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: takmirUserId,
        action:
          status === "APPROVED"
            ? "DONATION_JOURNAL_APPROVED"
            : "DONATION_JOURNAL_REJECTED",
        entityType: "DONATION",
        entityId: updated.id,
        entityName: updated.Nama || updated.user?.NamaLengkap || "Donasi",
        metadata: {
          donasiId: updated.id,
          donasiMasjidId: updated.id_donasi_masjid,
          masjidId: updated.masjidId || updated.donasi_masjid?.id_masjid,
          status,
          reason: reason?.trim() || null,
          jurnalTransactionId,
          referensi: `DONASI:${updated.id}`,
        },
      },
    });

    return updated;
  });
}

module.exports = {
  getAllDonaturTakmir,
  getAllDonasi,
  getDonasi,
  createDonasi,
  updateDonasiJurnalApproval,
};
