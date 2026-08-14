const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function connectDB() {
  try {
    await prisma.$connect();
    console.log("Database Connected Successfully");
  } catch (error) {
    console.error("DATABASE CONNECTION ERROR:", {
      name: error.name,
      code: error.code,
      message: error.message,
    });
    throw error;
  }
}

module.exports = {
  prisma,
  connectDB,
};
