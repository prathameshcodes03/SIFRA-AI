require("dotenv").config();

const app = require("./src/app");
const PORT = process.env.PORT || 3000;
const { connectDB, prisma } = require("./src/data/db");

const REQUIRED_SECRETS = ["DATABASE_URL", "JWT_SECRET"];
const OPTIONAL_SECRETS = [
  "ELEVENLABS_API_KEY",
  "BREVO_API_KEY",
  "IMAGEKIT_PRIVATE_KEY",
  "ML_SERVICE_URL",
  "ML_SERVICE_SECRET",
];

let server;

async function startServer() {
  try {
    const missing = REQUIRED_SECRETS.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Required environment variables not configured: ${missing.join(
          ", ",
        )}. The server cannot start without these secrets.`,
      );
    }

    const missingOptional = OPTIONAL_SECRETS.filter(
      (key) => !process.env[key],
    );
    if (missingOptional.length > 0) {
      console.warn(
        `CONFIG NOTICE: Optional environment variables not set: ${missingOptional.join(
          ", ",
        )}. Related features will be unavailable.`,
      );
    }

    await connectDB();

    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("SERVER STARTUP ERROR:", {
      name: err.name,
      code: err.code,
      message: err.message,
    });
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log("HTTP server closed.");
    });
  }
  try {
    await prisma.$disconnect();
    console.log("Database client disconnected.");
  } catch (err) {
    console.error("Error disconnecting database:", err.message);
  }
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
