
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
  const [statusMessage, setStatusMessage] = useState({
    type: "",
    text: "",
  });

  // -----------------------------
  // OTP COOLDOWN TIMER
  // -----------------------------
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  // -----------------------------
  // HANDLE INPUT CHANGES
  // -----------------------------
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // -----------------------------
  // SEND OTP
  // -----------------------------
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

    if (cooldown > 0) {
      return;
    }

    setSendingOtp(true);
    setStatusMessage({
      type: "",
      text: "",
    });

    try {
      const response = await api.post("/api/auth/send-otp", {
        email,
      });

      setOtpSent(true);
      setCooldown(60);

      setFormData((prev) => ({
        ...prev,
        otp: "",
      }));

      setStatusMessage({
        type: "success",
        text:
          response.data?.message ||
          "Verification code sent! Please check your email.",
      });
    } catch (error) {
      console.error("Send OTP error:", error);

      const message =
        error.response?.data?.message ||
        "Failed to send verification code. Please try again.";

      setStatusMessage({
        type: "error",
        text: message,
      });

      if (error.response?.data?.remainingSeconds) {
        setCooldown(error.response.data.remainingSeconds);
      }
    } finally {
      setSendingOtp(false);
    }
  };

  // -----------------------------
  // REGISTER USER
  // -----------------------------
  const handleRegister = async (event) => {
    event.preventDefault();

    setStatusMessage({
      type: "",
      text: "",
    });

    // Check OTP
    if (!formData.otp || formData.otp.trim().length !== 6) {
      setStatusMessage({
        type: "error",
        text: "Please enter the 6-digit OTP sent to your email.",
      });
      return;
    }

    // Basic validation
    if (!formData.fullName.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter your full name.",
      });
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setStatusMessage({
        type: "error",
        text: "Password must be at least 6 characters.",
      });
      return;
    }

    if (!formData.age) {
      setStatusMessage({
        type: "error",
        text: "Please enter your age.",
      });
      return;
    }

    if (!formData.weight) {
      setStatusMessage({
        type: "error",
        text: "Please enter your weight.",
      });
      return;
    }

    if (!formData.gender) {
      setStatusMessage({
        type: "error",
        text: "Please select your gender.",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        age: Number(formData.age),
        weight: Number(formData.weight),
        gender: formData.gender,
        otp: formData.otp.trim(),
      };

      console.log("Register request:", {
        ...payload,
        password: "***",
        otp: "******",
      });

      const response = await api.post(
        "/api/auth/register",
        payload
      );

      // Save token if backend returns one
      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
      }

      setStatusMessage({
        type: "success",
        text: "Account created successfully! Redirecting to login...",
      });

      // Redirect to login
      setTimeout(() => {
        navigate("/Login");
      }, 1500);
    } catch (error) {
      console.error("Registration error:", error);

      const message =
        error.response?.data?.message ||
        "Registration failed. Please try again.";

      setStatusMessage({
        type: "error",
        text: message,
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

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-[#070710]/75 backdrop-blur-[3px]" />

      {/* Registration Form */}
      <form
        onSubmit={handleRegister}
        className="relative z-10 my-auto w-full max-w-md rounded-2xl border border-white/15 bg-black/50 p-4 shadow-[0_0_50px_rgba(139,92,246,0.2)] backdrop-blur-2xl sm:p-6"
      >

        {/* Header */}
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
            Sifra.AI
          </h1>

          <p className="mt-0.5 text-xs text-zinc-400">
            Create your account to start training
          </p>
        </div>

        <div className="mt-3.5 space-y-2.5">

          {/* Full Name  */}
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">

  <div className="sm:col-span-2">
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
      Full Name
    </label>

    <input
      required
      type="text"
      name="fullName"
      placeholder="Alex Johnson"
      value={formData.fullName}
      onChange={handleChange}
      className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder-zinc-500 transition focus:border-violet-400 focus:bg-white/10 focus:outline-none"
    />
  </div>

</div>

          {/* Email*/}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              Email Address
            </label>

            <div className="flex gap-2">

              <input
                required
                type="email"
                name="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                className="h-10 w-full flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder-zinc-500 transition focus:border-violet-400 focus:bg-white/10 focus:outline-none"
              />

            

            </div>
          </div>

<div>
                <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Password
              </label>

              <input
                required
                type="password"
                name="password"
                placeholder="Min. 6 chars"
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="h-10 w-[75%] rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder-zinc-500 transition focus:border-violet-400 focus:bg-white/10 focus:outline-none"
              />
            

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || cooldown > 0}
                className="h-10 shrink-0 gap-[2rem] cursor-pointer rounded-lg border border-violet-500/40 bg-gradient-to-r from-violet-600/90 to-indigo-600/90 px-3 text-xs font-semibold text-white shadow-[0_0_12px_rgba(139,92,246,0.3)] transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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

          {/* OTP */}
          <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 px-3 py-2">

            <div className="flex items-center justify-between">

              <label className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                Email OTP Code
              </label>

              <span className="text-[10px]">
                {otpSent ? (
                  <span className="font-medium text-emerald-400">
                    ✓ Sent to inbox
                  </span>
                ) : (
                  <span className="text-zinc-400">
                    Valid for 10 min
                  </span>
                )}
              </span>

            </div>

            <input
              required
              type="text"
              inputMode="numeric"
              maxLength={6}
              name="otp"
              placeholder="Enter 6-digit OTP"
              value={formData.otp}
              onChange={(event) => {
                const value = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6);

                setFormData((prev) => ({
                  ...prev,
                  otp: value,
                }));
              }}
              className="mt-1 h-9 w-full rounded-lg border border-white/20 bg-black/40 px-3 text-center font-mono text-base font-bold tracking-[0.3em] text-violet-200 placeholder-zinc-600 transition focus:border-violet-400 focus:outline-none"
            />

          </div>

          {/* Age / Weight / Gender */}
          <div className="grid grid-cols-3 gap-2">

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Age
              </label>

              <input
                required
                type="number"
                min={10}
                max={100}
                name="age"
                placeholder="24"
                value={formData.age}
                onChange={handleChange}
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
                min={20}
                max={300}
                name="weight"
                placeholder="70"
                value={formData.weight}
                onChange={handleChange}
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
                onChange={handleChange}
                className="h-9 w-full rounded-lg border border-white/15 bg-[#141224] px-1.5 text-center text-xs text-white transition focus:border-violet-400 focus:outline-none"
              >
                <option value="" disabled>
                  Gender
                </option>

                <option value="MALE">
                  Male
                </option>

                <option value="FEMALE">
                  Female
                </option>

                <option value="OTHER">
                  Other
                </option>
              </select>
            </div>

          </div>
        </div>

  


        {/* Register Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-3.5 h-10 w-full cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-xs font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] transition hover:brightness-110 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        {/* Login */}
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
