import axios from "axios";

// Automatically route API requests to localhost:3000 when developing locally,
// and to the production Render URL when deployed.
const resolveBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
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

  return envUrl || "https://sifra-ai.onrender.com";
};

const api = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true,
});

export default api;
