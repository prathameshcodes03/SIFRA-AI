const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const authRoutes = require("./Routes/auth.routes");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const workoutRoutes = require("./Routes/workout.routes");
const profileRoutes = require("./Routes/profile.routes");
const formPredictionRoutes = require("./Routes/formPrediction.routes");

const voiceRoutes = require("./Routes/voiceRoutes");
const { csrfProtection } = require("./Middlewares/csrf.middleware");


const app = express();
app.disable("x-powered-by");
const allowedOrigins = [
  "http://localhost:5173",
  "https://sifra-ai-1.onrender.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

// ==========================================
// HTTP SECURITY HEADERS (Helmet)
// ==========================================

// Base Content Security Policy. The SPA loads Google Fonts and Font Awesome
// from CDNs, and MediaPipe loads its WASM model from Google storage and
// jsDelivr. `style-src` includes 'unsafe-inline' because Tailwind utility
// classes and React inline styles are injected as inline styles at runtime.
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-eval'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com",
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: [
        "'self'",
        "data:",
        "https://ik.imagekit.io",
        "https://ik.imagekit.io/",
      ],
      connectSrc: [
        "'self'",
        "https://storage.googleapis.com",
        "https://cdn.jsdelivr.net",
      ],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
      manifestSrc: ["'self'"],
    },
    ...(!isProduction
      ? {
          connectSrc: [
            "'self'",
            "https://storage.googleapis.com",
            "https://cdn.jsdelivr.net",
            "ws:",
            "wss:",
          ],
        }
      : {}),
  }),
);

app.use(helmet.referrerPolicy({ policy: "strict-origin-when-cross-origin" }));
app.use(helmet.xContentTypeOptions());
app.use(helmet.frameguard({ action: "sameorigin" }));
app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  }),
);

app.use(
  helmet.permittedCrossDomainPolicies({ permittedPolicies: "by-content-type" }),
);

app.use(express.json());
app.use(cookieParser());

// Structured request logging with correlation ID
app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.set("x-request-id", requestId);
  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    console.log(
      JSON.stringify({
        level: "info",
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        ip: req.ip,
        userAgent: req.get("user-agent") || null,
      })
    );
  });

  next();
});

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

// Centralized error handler - must be last middleware
app.use((err, req, res, next) => {
  const requestId = req.headers["x-request-id"] || res.get("x-request-id") || "unknown";
  const statusCode = err.statusCode || 500;

  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      error: err.name || "Error",
      message: isProduction ? "Internal Server Error" : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    })
  );

  res.status(statusCode).json({
    success: false,
    message: isProduction ? "Internal Server Error" : err.message,
    ...(isProduction ? {} : { error: err.name, stack: err.stack }),
    ...(requestId ? { requestId } : {}),
  });
});

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
