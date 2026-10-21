import axios from "axios";

/**
 * PRODUCTION BACKEND: https://sifra-ai.onrender.com
 *
 * This is the live Express service. The previously hardcoded
 * https://sifra-ai-backend.onrender.com does NOT resolve - Render answers
 * "no-server" - so falling back to it silently breaks every API call whenever
 * VITE_API_URL is absent or points at localhost.
 */
const PRODUCTION_API_URL = "https://sifra-ai.onrender.com";

// Automatically route API requests to localhost:3000 when developing locally,
// and to the production Render URL when deployed.
const resolveBaseURL = () => {
  // Optional access keeps this module importable outside Vite (unit tests),
  // where `import.meta.env` does not exist. Vite always defines it in builds.
  const envUrl = import.meta.env?.VITE_API_URL;
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (isLocal) {
    // If running on local dev server, connect to local Express server
    return envUrl && !envUrl.includes("onrender.com")
      ? envUrl
      : "http://localhost:3000";
  }

  // In production, if envUrl is a localhost URL (misconfigured), fall back to
  // the production backend URL that matches the CORS-allowed origin.
  if (envUrl && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
    return PRODUCTION_API_URL;
  }

  return envUrl || PRODUCTION_API_URL;
};

/**
 * The browser's IANA time zone.
 *
 * A workout streak counts CALENDAR days, and the user's day starts in their
 * own zone - not the server's (UTC on Render). A session finished at 00:30
 * local is 19:00 UTC on the previous date, so the server needs to know the
 * client's zone to file it under the right day.
 *
 * Returns null when the platform cannot report it; the backend then falls
 * back to its own zone.
 */
const resolveClientTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

const api = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true,
});

// Every request carries the client's time zone so the backend can count
// calendar days in the user's own day.
api.interceptors.request.use((config) => {
  const timeZone = resolveClientTimeZone();
  if (!timeZone) return config;

  if (config.headers && typeof config.headers.set === "function") {
    config.headers.set("X-Client-Timezone", timeZone);
  } else {
    config.headers = {
      ...(config.headers || {}),
      "X-Client-Timezone": timeZone,
    };
  }

  return config;
});

export default api;
