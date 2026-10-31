const allowedOrigins = [
  "http://localhost:5173",
  "https://sifra-ai-1.onrender.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

// Origin/Referer validation for state-changing requests using cookie auth.
const csrfProtection = (req, res, next) => {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return next();
  }

  const origin = req.get("Origin");
  const referer = req.get("Referer");
  const hasCookie = Boolean(req.get("Cookie"));

  let sourceOrigin = null;
  let headerPresent = false;

  if (origin) {
    headerPresent = true;
    try {
      sourceOrigin = new URL(origin).origin;
    } catch (e) {
      // Malformed Origin header -> reject.
      return res.status(403).json({
        success: false,
        message: "CSRF validation failed.",
      });
    }
  } else if (referer) {
    headerPresent = true;
    try {
      sourceOrigin = new URL(referer).origin;
    } catch (e) {
      return res.status(403).json({
        success: false,
        message: "CSRF validation failed.",
      });
    }
  }

  // No Origin/Referer:
  // - Non-browser clients without cookies are allowed.
  // - Browser-style requests carrying a session cookie must present an origin.
  if (!headerPresent) {
    if (hasCookie) {
      return res.status(403).json({
        success: false,
        message: "CSRF validation failed.",
      });
    }
    return next();
  }

  if (allowedOrigins.includes(sourceOrigin)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "CSRF validation failed.",
  });
};

module.exports = { csrfProtection, allowedOrigins };