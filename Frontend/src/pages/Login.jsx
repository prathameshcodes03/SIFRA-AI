import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../Context/AuthContext";
import Pushups from "../assets/Videos/Pushups.mp4"

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const loginResponse = await api.post("/api/auth/login", formData);
      const currentUserResponse = await api.get("/api/auth/me");

      login(currentUserResponse.data.user, loginResponse.data.token);
      setMessage(loginResponse.data.message);
      navigate("/Dashboard");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
   <section className="relative grid min-h-[100svh] place-items-center overflow-hidden px-4 py-8">
  
  {/* Background Video */}
  <video
    className="absolute inset-0 h-full w-full object-cover"
    autoPlay
    loop
    muted
    playsInline
  >
    <source src= {Pushups} type="video/mp4" />
  </video>
    
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <form
        onSubmit={handleLogin}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-black/30 p-6 shadow-[0_0_50px_rgba(139,92,246,.25)] backdrop-blur-xl sm:p-8"
      >
        <h1 className="bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-center text-[clamp(2.25rem,10vw,3rem)] font-extrabold text-transparent">
          Sifra.AI
        </h1>
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Sign in to continue your fitness journey
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="sr-only">Email address</span>
            <input
              required
              type="email"
              placeholder="Email address"
              name="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="min-h-13 w-full rounded-2xl border border-white/20 bg-white/5 px-4 text-white placeholder-gray-400 transition focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,.35)]"
            />
          </label>
          <label className="block">
            <span className="sr-only">Password</span>
            <input
              required
              type="password"
              placeholder="Password"
              name="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="min-h-13 w-full rounded-2xl border border-white/20 bg-white/5 px-4 text-white placeholder-gray-400 transition focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,.35)]"
            />
          </label>
        </div>
        {message && (
          <p role="status" className="mt-4 text-center text-sm text-white/80">
            {message}
          </p>
        )}
        <button
          disabled={loading}
          className="mt-7 min-h-13 w-full rounded-2xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 font-semibold text-white transition hover:shadow-[0_0_30px_rgba(168,85,247,.6)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-7 text-center text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Link
            to="/Register"
            className="font-medium text-violet-300 hover:text-violet-200"
          >
            Register
          </Link>
        </p>
      </form>
    </section>
  );
};
export default Login;
