import axios from "axios";

/**
 * API base URL resolution.
 *
 * `VITE_API_URL` is the single source of truth for the backend URL in every
 * environment. It must be set to the production backend's public URL when
 * deployed (e.g. the Render backend service URL). There is no hardcoded
 * production hostname, so a missing or misconfigured `VITE_API_URL` fails
 * loudly instead of silently sending requests to the wrong host.
 *
 * Local development defaults to http://localhost:3000 when `VITE_API_URL` is
 * unset or points at a Render host.
 */

// Automatically route API requests to localhost:3000 when developing locally,
// and to the configured VITE_API_URL when deployed.
const resolveBaseURL = () => {
  // Optional access keeps this module importable outside Vite (unit tests),
  // where `import.meta.env` does not exist. Vite always defines it in builds.
  const envUrl = import.meta.env?.VITE_API_URL;
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (isLocal) {
    // Local development: explicit VITE_API_URL wins; otherwise default to
    // the local Express backend. Ignore onrender.com values locally so a
    // stale env var doesn't redirect dev traffic to production.
    if (envUrl && !envUrl.includes("onrender.com")) {
      return envUrl;
    }
    return "http://localhost:3000";
  }

  // Production: VITE_API_URL must be explicitly configured. No silent fallback
  // to a hardcoded hostname, which previously risked pointing at a non-existent
  // service and breaking every API call.
  if (!envUrl) {
    return "";
  }

  // Reject localhost loopback values in production (misconfigured env).
  if (envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
    return "";
  }

  // Ensure the URL includes a protocol so axios can resolve it.
  if (!/^https?:\/\//i.test(envUrl)) {
    return `https://${envUrl}`;
  }

  return envUrl;
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
