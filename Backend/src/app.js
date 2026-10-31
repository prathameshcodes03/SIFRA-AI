const express = require("express");
const authRoutes = require("./Routes/auth.routes");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const workoutRoutes = require("./Routes/workout.routes");
const profileRoutes = require("./Routes/profile.routes");
const formPredictionRoutes = require("./Routes/formPrediction.routes");

const voiceRoutes = require("./Routes/voiceRoutes");
const { csrfProtection } = require("./Middlewares/csrf.middleware");



const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "https://sifra-ai-1.onrender.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: allowedOrigins,

    credentials: true,
  }),
);


app.use(csrfProtection);
app.use("/api/voice", voiceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/workout", formPredictionRoutes);



app.get("/api/health", async (req, res) => {
  try {
    const { prisma } = require("./data/db");
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = app;
