const rateLimit = require("express-rate-limit");

const authLimiterOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  },
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  ...authLimiterOptions,
});

const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  ...authLimiterOptions,
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  ...authLimiterOptions,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  ...authLimiterOptions,
});

// Voice coaching endpoint: limits ElevenLabs TTS requests to protect against
// credit exhaustion. Cached cues are served from memory without hitting the
// API, but distinct texts still consume credits, so we rate-limit the route.
const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many voice coaching requests. Please try again later.",
    });
  },
});

// ML form prediction endpoint: limits calls to the form-classification model
// proxy to prevent abuse and protect backend/ML-service capacity. Keyed by IP
// because this route is publicly accessible (no authentication required).
const mlPredictionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many form prediction requests. Please try again later.",
    });
  },
});

// Workout mutation endpoint: limits create/complete/update/delete operations
// to prevent abuse of workout CRUD. Keyed by authenticated user ID so that
// legitimate users sharing an IP (e.g. same household) are not penalised
// together, and a single user cannot burst mutations.
const workoutMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user && req.user.id ? `user:${req.user.id}` : req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many workout requests. Please try again later.",
    });
  },
});

module.exports = {
  loginLimiter,
  sendOtpLimiter,
  verifyOtpLimiter,
  registerLimiter,
  voiceLimiter,
  mlPredictionLimiter,
  workoutMutationLimiter,
};
