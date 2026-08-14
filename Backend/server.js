require("dotenv").config();

const app = require("./src/app");
const PORT = process.env.PORT || 3000;
const { connectDB } = require("./src/data/db");

async function startServer() {
  try {
    if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
      throw new Error(
        "DATABASE_URL and JWT_SECRET must be configured before the server can start.",
      );
    }

    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
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
