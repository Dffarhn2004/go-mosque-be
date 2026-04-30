const bcrypt = require("bcrypt");
const CustomError = require("../utils/custom_error");
const { generateToken } = require("../utils/jwt");
const prisma = require("../utils/prisma_client");

async function registerUser(userData) {
  const { username, email, password } = userData;

  try {
    // Cek user
    const existingUser = await prisma.user.findUnique({
      where: { Email: email },
    });
    if (existingUser) {
      throw new CustomError("Email is already in use", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Cari role "Donatur" atau buat jika belum ada
      let donaturRole = await tx.role.findFirst({
        where: { Nama: "Donatur" },
      });

      if (!donaturRole) {
        // Jika tidak ada, gunakan ID default dari seed
        donaturRole = await tx.role.findUnique({
          where: { id: "cmb6vlo570001vgzgsq1p0c42" },
        });
      }

      if (!donaturRole) {
        throw new CustomError("Donatur role not found. Please run seed first.", 500);
      }

      // Buat user
      const user = await tx.user.create({
        data: {
          NamaLengkap: username,
          Email: email,
          Password: hashedPassword,
          roleId: donaturRole.id,
        },
      });

      return { user };
    });

    return result;
  } catch (error) {
    console.error("Error during registration:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Registration failed");
  }
}
async function registerTakmir(userData, dataMasjid) {
  const { username, email, password } = userData;

  try {
    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { Email: email },
    });
    if (existingUser) {
      throw new CustomError("Email is already in use", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Create Masjid first
      const masjid = await tx.masjid.create({
        data: {
          Nama: dataMasjid.nama_masjid || "Masjid Baru",
          Alamat: dataMasjid.alamat || "-",
          NomorTelepon: dataMasjid.nomor_telfon || "-",
          // add more fields if needed here...
        },
      });

      // Create User linked to Masjid
      const user = await tx.user.create({
        data: {
          NamaLengkap: username,
          Email: email,
          Password: hashedPassword,
          roleId: "cmb6vlo570001vgzgsq1p0c40", // Takmir role id, keep this secure
          masjidId: masjid.id,
        },
      });

      return { user, masjid };
    });

    return result;
  } catch (error) {
    console.error("Error during registration:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Registration failed");
  }
}

async function loginUser(email, password) {
  try {
    const user = await prisma.user.findUnique({
      where: { Email: email },
      include:{
        masjid:true,
        role: true,
      }
    });

    if (!user) {
      throw new CustomError("Invalid email or password", 401);
    }

    if (user.isActive === false) {
      throw new CustomError("User account is inactive", 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.Password);
    if (!isPasswordValid) {
      throw new CustomError("Invalid email or password", 401);
    }

    const { Password: _, ...userWithoutPassword } = user;

    // JWT Payload
    const token = generateToken({
      id: user.id,
      email: user.Email,
      roleId: user.roleId,
    });

    return {
      token,
      user: {
        ...userWithoutPassword,
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Login failed");
  }
}

module.exports = {
  registerTakmir,
  registerUser,
  loginUser,
};
