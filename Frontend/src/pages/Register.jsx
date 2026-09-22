import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Pushups from "../assets/Videos/Pushups.mp4";

const Register = () => {
  const navigate = useNavigate();

const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    age: "",
    gender: "",
    weight: "",
    otp: "",
  });

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [statusMessage, setStatusMessage] = useState({
    type: "",
    text: "",
  });

  // -----------------------------------------
  // OTP COOLDOWN
  // -----------------------------------------

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  // -----------------------------------------
  // INPUT HANDLER
  // -----------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // -----------------------------------------
  // STEP 1 VALIDATION
  // -----------------------------------------

  const goToPasswordStep = () => {
    setStatusMessage({
      type: "",
      text: "",
    });

    const email = formData.email.trim();

    if (!email) {
      setStatusMessage({
        type: "error",
        text: "Please enter your email address.",
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

    setStep(2);
  };

  // -----------------------------------------
  // STEP 2 VALIDATION
  // -----------------------------------------

  const goToPersonalDetails = () => {
    setStatusMessage({
      type: "",
      text: "",
    });

    if (!formData.password) {
      setStatusMessage({
        type: "error",
        text: "Please enter a password.",
      });
      return;
    }

    if (formData.password.length < 6) {
      setStatusMessage({
        type: "error",
        text: "Password must be at least 6 characters.",
      });
      return;
    }

    setStep(3);
  };

  // -----------------------------------------
  // SEND OTP
  // -----------------------------------------

  const sendOtp = async () => {
    const email = formData.email.trim().toLowerCase();

    setStatusMessage({
      type: "",
      text: "",
    });

    if (cooldown > 0) return;

    setSendingOtp(true);

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
          "Verification code sent to your email.",
      });

      setStep(4);
    } catch (error) {
      console.error("Send OTP error:", error);

      setStatusMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Failed to send OTP. Please try again.",
      });

      if (error.response?.data?.remainingSeconds) {
        setCooldown(error.response.data.remainingSeconds);
      }
    } finally {
      setSendingOtp(false);
    }
  };

  // -----------------------------------------
  // STEP 3 VALIDATION
  // -----------------------------------------

  const goToOtpStep = async () => {
    setStatusMessage({
      type: "",
      text: "",
    });

    if (!formData.fullName.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter your full name.",
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

    await sendOtp();
  };

  // -----------------------------------------
  // VERIFY OTP
  // -----------------------------------------



  // -----------------------------------------
  // CREATE ACCOUNT
  // -----------------------------------------

  const createAccount = async () => {
    setRegistering(true);

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

      const response = await api.post(
        "/api/auth/register",
        payload
      );

      if (response.data?.token) {
        localStorage.setItem(
          "token",
          response.data.token
        );
      }

      setStatusMessage({
        type: "success",
        text: "Account created successfully!",
      });

      setTimeout(() => {
        navigate("/Login");
      }, 1000);

    } catch (error) {
      console.error("Registration error:", error);

      setStatusMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Account creation failed. Please try again.",
      });
    } finally {
      setRegistering(false);
    }
  };

  // -----------------------------------------
  // BACK BUTTON
  // -----------------------------------------

  const goBack = () => {
    setStatusMessage({
      type: "",
      text: "",
    });

    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  // -----------------------------------------
  // RENDER
  // -----------------------------------------

  return (
    <section className="relative flex min-h-screen ml-20 w-full items-center justify-center bg-[#070710] px-4 py-8">

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

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-black/50 p-6 shadow-2xl backdrop-blur-xl">

        {/* HEADER */}

        <div className="mb-6 text-center">
          <h1 className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-3xl font-black text-transparent">
            Sifra.AI
          </h1>

          <p className="mt-1 text-sm text-zinc-400">
            Create your account to start training
          </p>
        </div>

        {/* PROGRESS */}

        <div className="mb-6">
          <div className="mb-2 flex justify-between text-xs text-zinc-500">
            <span>Step {step} of 4</span>
            <span>{step * 25}%</span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{
                width: `${step * 25}%`,
              }}
            />
          </div>
        </div>

        {/* STATUS MESSAGE */}

        {statusMessage.text && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              statusMessage.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* ===================================== */}
        {/* STEP 1 — EMAIL */}
        {/* ===================================== */}

        {step === 1 && (
          <div className="animate-in fade-in duration-300">

            <h2 className="mb-2 text-2xl font-bold text-white">
              Create your account
            </h2>

            <p className="mb-6 text-sm text-zinc-400">
              Start with your email address.
            </p>

            <label className="mb-2 block text-sm font-semibold text-zinc-300">
              Email Address
            </label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="h-12 w-full rounded-lg border border-white/15 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-violet-400"
            />

            <button
              type="button"
              onClick={goToPasswordStep}
              className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-white transition hover:brightness-110 active:scale-[0.99]"
            >
              Continue
            </button>
          </div>
        )}

        {/* ===================================== */}
        {/* STEP 2 — PASSWORD */}
        {/* ===================================== */}

        {step === 2 && (
          <div className="animate-in slide-in-from-right duration-300">

            <button
              type="button"
              onClick={goBack}
              className="mb-4 text-sm text-zinc-400 hover:text-white"
            >
              ← Back
            </button>

            <h2 className="mb-2 text-2xl font-bold text-white">
              Create a password
            </h2>

            <p className="mb-6 text-sm text-zinc-400">
              Use at least 6 characters.
            </p>

            <label className="mb-2 block text-sm font-semibold text-zinc-300">
              Password
            </label>

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="h-12 w-full rounded-lg border border-white/15 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-violet-400"
            />

            <button
              type="button"
              onClick={goToPersonalDetails}
              className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-white transition hover:brightness-110"
            >
              Continue
            </button>
          </div>
        )}

        {/* ===================================== */}
        {/* STEP 3 — PERSONAL DETAILS */}
        {/* ===================================== */}

        {step === 3 && (
          <div className="animate-in slide-in-from-right duration-300">

            <button
              type="button"
              onClick={goBack}
              className="mb-4 text-sm text-zinc-400 hover:text-white"
            >
              ← Back
            </button>

            <h2 className="mb-2 text-2xl font-bold text-white">
              Tell us about yourself
            </h2>

            <p className="mb-6 text-sm text-zinc-400">
              This information helps personalize your workouts.
            </p>

            {/* NAME */}

            <label className="mb-2 block text-sm font-semibold text-zinc-300">
              Full Name
            </label>

            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Your name"
              className="mb-4 h-11 w-full rounded-lg border border-white/15 bg-white/5 px-4 text-sm text-white outline-none focus:border-violet-400"
            />

            {/* AGE + WEIGHT */}

            <div className="mb-4 grid grid-cols-2 gap-3">

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-300">
                  Age
                </label>

                <input
                  type="number"
                  name="age"
                  min="10"
                  max="100"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="Age"
                  className="h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-300">
                  Weight (kg)
                </label>

                <input
                  type="number"
                  name="weight"
                  min="20"
                  max="300"
                  step="0.5"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="70"
                  className="h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:border-violet-400"
                />
              </div>

            </div>

            {/* GENDER */}

            <label className="mb-2 block text-sm font-semibold text-zinc-300">
              Gender
            </label>

            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border border-white/15 bg-[#141224] px-3 text-sm text-white outline-none focus:border-violet-400"
            >
              <option value="">
                Select gender
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

            <button
              type="button"
              onClick={goToOtpStep}
              disabled={sendingOtp}
              className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendingOtp
                ? "Sending OTP..."
                : "Continue"}
            </button>
          </div>
        )}

        {/* ===================================== */}
        {/* STEP 4 — OTP */}
        {/* ===================================== */}
{/* ===================================== */}
{/* STEP 4 — OTP */}
{/* ===================================== */}

{step === 4 && (
  <div className="animate-in slide-in-from-right duration-300">

    <button
      type="button"
      onClick={() => setStep(3)}
      className="mb-4 text-sm text-zinc-400 hover:text-white"
    >
      ← Back
    </button>

    <h2 className="mb-2 text-2xl font-bold text-white">
      Verify your email
    </h2>

    <p className="mb-6 text-sm text-zinc-400">
      Enter the 6-digit OTP 
      <br />

      <span className="font-semibold text-violet-300">
        {formData.email}
      </span>
    </p>

    <label className="mb-2 block text-sm font-semibold text-zinc-300">
      Verification Code
    </label>

    <input
      type="text"
      name="otp"
      value={formData.otp}
      maxLength={6}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="Enter 6-digit OTP"
      onChange={(e) => {
        const value = e.target.value
          .replace(/\D/g, "")
          .slice(0, 6);

        setFormData((prev) => ({
          ...prev,
          otp: value,
        }));
      }}
      className="h-14 w-full rounded-lg border border-white/15 bg-white/5 px-4 text-center font-mono text-2xl tracking-[0.4em] text-white outline-none focus:border-violet-400"
    />

    {/* CREATE ACCOUNT */}

    <button
      type="button"
      onClick={createAccount}
      disabled={
        registering ||
        formData.otp.length !== 6
      }
      className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {registering
        ? "Creating Account..."
        : "Verify & Create Account"}
    </button>

    {/* RESEND OTP */}

    <div className="mt-5 text-center">

      <p className="text-sm text-zinc-500">
        Didn't receive the code?
      </p>

      <button
        type="button"
        onClick={sendOtp}
        disabled={
          sendingOtp ||
          cooldown > 0
        }
        className="mt-2 text-sm font-semibold text-violet-300 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-600"
      >
        {cooldown > 0
          ? `Resend OTP in ${cooldown}s`
          : "Resend OTP"}
      </button>

    </div>

  </div>
)}
       </div>
        

        {/* LOGIN */}

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            to="/Login"
            className="font-semibold text-violet-300 hover:text-white hover:underline"
          >
            Sign in
          </Link>
        </p>

       

  



    </section>
  );
};

export default Register;