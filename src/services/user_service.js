const bcrypt = require("bcrypt");
const prisma = require("../utils/prisma_client");
const CustomError = require("../utils/custom_error");

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, masjid: true },
  });

  if (!user) {
    throw new CustomError("User not found", 404);
  }

  return user;
}

async function updateMe({ userId, namaLengkap, email, currentPassword, newPassword }) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existing) {
    throw new CustomError("User not found", 404);
  }

  const data = {};

  if (typeof namaLengkap === "string") {
    const trimmed = namaLengkap.trim();
    if (!trimmed) throw new CustomError("NamaLengkap tidak boleh kosong", 400);
    data.NamaLengkap = trimmed;
  }

  if (typeof email === "string") {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) throw new CustomError("Email tidak boleh kosong", 400);

    const clash = await prisma.user.findUnique({
      where: { Email: trimmed },
      select: { id: true },
    });
    if (clash && clash.id !== userId) {
      throw new CustomError("Email sudah digunakan", 409);
    }

    data.Email = trimmed;
  }

  const wantsPasswordChange =
    typeof currentPassword === "string" || typeof newPassword === "string";

  if (wantsPasswordChange) {
    if (!currentPassword || !newPassword) {
      throw new CustomError("currentPassword dan newPassword wajib diisi", 400);
    }

    const ok = await bcrypt.compare(currentPassword, existing.Password);
    if (!ok) {
      throw new CustomError("Password saat ini salah", 400);
    }

    if (String(newPassword).length < 6) {
      throw new CustomError("Password baru minimal 6 karakter", 400);
    }

    data.Password = await bcrypt.hash(newPassword, 10);
  }

  if (!Object.keys(data).length) {
    return getMe(userId);
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    include: { role: true, masjid: true },
  });
}

module.exports = {
  getMe,
  updateMe,
};

