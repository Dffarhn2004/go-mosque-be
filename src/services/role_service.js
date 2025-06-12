const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

async function getAllRoles() {
    return await prisma.role.findMany();
}

async function createRole(data) {
    // data should contain the fields required to create a role, e.g. { name: 'Admin' }
    return await prisma.role.create({
        data: {
            Nama: data,
            // Add other fields if necessary
        }
    });
}

module.exports = {
    getAllRoles,
    createRole,
};