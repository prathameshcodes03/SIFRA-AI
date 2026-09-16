const express = require("express");
const authRoutes = require("./Routes/auth.routes");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const workoutRoutes = require("./Routes/workout.routes");
const profileRoutes = require("./Routes/profile.routes");
const formPredictionRoutes = require("./Routes/formPrediction.routes");

const voiceRoutes = require("./Routes/voiceRoutes");



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


app.use("/api/voice", voiceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/workout", formPredictionRoutes);



module.exports = app;
