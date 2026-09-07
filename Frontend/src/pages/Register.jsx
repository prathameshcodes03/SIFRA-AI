import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Pushups from "../assets/Videos/Pushups.mp4";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    age: "",
    gender: "",
    weight: "",
    otp: "",
  });

  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    const email = formData.email.trim();
    if (!email) {
      setStatusMessage({
        type: "error",
        text: "Please enter your email address first.",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatusMessage({
        type: "error",
        text: "Please enter a valid email address.",
      });
      return;
    }

    setSendingOtp(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const response = await api.post("/api/auth/send-otp", { email });
      setOtpSent(true);
      setCooldown(60);

      const devNote = response.data?.devOtp
        ? ` (Dev Code: ${response.data.devOtp})`
        : "";
      setStatusMessage({
        type: "success",
        text:
          (response.data.message || "Verification code sent to your email!") +
          devNote,
      });

      if (response.data?.devOtp) {
        setFormData((prev) => ({ ...prev, otp: response.data.devOtp }));
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to send verification code. Please try again.";
      setStatusMessage({ type: "error", text: errorMsg });

      if (error.response?.data?.remainingSeconds) {
        setCooldown(error.response.data.remainingSeconds);
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setStatusMessage({ type: "", text: "" });

    if (!formData.otp || formData.otp.trim().length !== 6) {
      setStatusMessage({
        type: "error",
        text: "Please enter the 6-digit OTP sent to your email.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/auth/register", {
        ...formData,
        email: formData.email.trim(),
        age: Number(formData.age),
        weight: Number(formData.weight),
        otp: formData.otp.trim(),
      });

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }

      setStatusMessage({
        type: "success",
        text: "Account registered successfully! Redirecting to login...",
      });

      setTimeout(() => {
        navigate("/Login");
      }, 1500);
    } catch (error) {
      setStatusMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative flex h-[100svh] max-h-[100svh] w-full items-center justify-center overflow-hidden px-4 py-2">
      {/* Background Video */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={Pushups} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[#070710]/75 backdrop-blur-[3px]" />

      <form
        onSubmit={handleRegister}
        className="relative z-10 my-auto w-full max-w-md rounded-2xl border border-white/15 bg-black/50 p-4 sm:p-6 shadow-[0_0_50px_rgba(139,92,246,0.2)] backdrop-blur-2xl"
      >
        {/* Compact Header */}
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-2xl sm:text-3xl font-black tracking-tight text-transparent">
            Sifra.AI
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Create your account to start training
          </p>
        </div>

        <div className="mt-3.5 space-y-2.5">
          {/* Row 1: Full Name & Password (2 Columns) */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Full Name
              </label>
              <input
                required
                type="text"
                placeholder="Alex Johnson"
                name="fullName"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder-zinc-500 transition focus:border-violet-400 focus:bg-white/10 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Password
              </label>
              <input
                required
                type="password"
                placeholder="Min. 6 chars"
                name="password"
                minLength={6}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder-zinc-500 transition focus:border-violet-400 focus:bg-white/10 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Email Address + Send OTP Button */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              Email Address
            </label>
            <div className="flex gap-2">
              <input
                required
                type="email"
                placeholder="name@example.com"
                name="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="h-10 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder-zinc-500 transition focus:border-violet-400 focus:bg-white/10 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || cooldown > 0}
                className="h-10 shrink-0 cursor-pointer rounded-lg border border-violet-500/40 bg-gradient-to-r from-violet-600/90 to-indigo-600/90 px-3 text-xs font-semibold text-white shadow-[0_0_12px_rgba(139,92,246,0.3)] transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingOtp
                  ? "Sending..."
                  : cooldown > 0
                  ? `${cooldown}s`
                  : otpSent
                  ? "Resend"
                  : "Send OTP"}
              </button>
            </div>
          </div>

          {/* Row 3: Compact OTP Verification Input */}
          <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 px-3 py-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                Email OTP Code
              </label>
              <span className="text-[10px] text-zinc-400">
                {otpSent ? (
                  <span className="text-emerald-400 font-medium">✓ Sent to inbox</span>
                ) : (
                  "Valid for 10 min"
                )}
              </span>
            </div>
            <input
              required
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              name="otp"
              value={formData.otp}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  otp: e.target.value.replace(/\D/g, ""),
                })
              }
              className="mt-1 h-9 w-full rounded-lg border border-white/20 bg-black/40 px-3 text-center font-mono text-base font-bold tracking-[0.3em] text-violet-200 placeholder-zinc-600 transition focus:border-violet-400 focus:outline-none"
            />
          </div>

          {/* Row 4: Age, Weight, Gender (3 Columns in 1 Row) */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Age
              </label>
              <input
                required
                type="number"
                placeholder="24"
                min={10}
                max={100}
                name="age"
                value={formData.age}
                onChange={(e) =>
                  setFormData({ ...formData, age: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-center text-xs text-white placeholder-zinc-500 transition focus:border-violet-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Weight (kg)
              </label>
              <input
                required
                type="number"
                step="0.5"
                placeholder="70"
                min={20}
                max={300}
                name="weight"
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-center text-xs text-white placeholder-zinc-500 transition focus:border-violet-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Gender
              </label>
              <select
                required
                name="gender"
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-white/15 bg-[#141224] px-1.5 text-center text-xs text-white transition focus:border-violet-400 focus:outline-none"
              >
                <option value="" disabled>
                  Gender
                </option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Notification Alert */}
        {statusMessage.text && (
          <div
            className={`mt-2.5 rounded-lg border px-3 py-1.5 text-center text-xs font-medium transition ${
              statusMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-3.5 h-10 w-full cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-xs sm:text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] transition hover:brightness-110 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        {/* Sign In Link */}
        <p className="mt-3 text-center text-xs text-zinc-400">
          Already have an account?{" "}
          <Link
            to="/Login"
            className="font-semibold text-violet-300 transition hover:text-white hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </section>
  );
};

export default Register;
