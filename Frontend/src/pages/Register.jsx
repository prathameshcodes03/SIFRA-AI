import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Pushups from "../assets/Videos/Pushups.mp4";
import { 
  Mail, 
  Lock, 
  User, 
  Scale, 
  Calendar, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles,
  KeyRound,
  RefreshCw
} from "lucide-react";
import Logo from "../components/Logo";

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
  const [registering, setRegistering] = useState(false);
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
  const goToPasswordStep = (e) => {
    if (e) e.preventDefault();
    setStatusMessage({ type: "", text: "" });

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
  const goToPersonalDetails = (e) => {
    if (e) e.preventDefault();
    setStatusMessage({ type: "", text: "" });

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
        text: "Password must be at least 6 characters long.",
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
    setStatusMessage({ type: "", text: "" });

    if (cooldown > 0) return;
    setSendingOtp(true);

    try {
      const response = await api.post("/api/auth/send-otp", { email });
      setCooldown(60);
      setFormData((prev) => ({ ...prev, otp: "" }));
      setStatusMessage({
        type: "success",
        text: response.data?.message || `Verification code sent to ${email}`,
      });
      setStep(4);
    } catch (error) {
      console.error("Send OTP error:", error);
      setStatusMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to send verification code. Please try again.",
      });
      if (error.response?.data?.remainingSeconds) {
        setCooldown(error.response.data.remainingSeconds);
      }
    } finally {
      setSendingOtp(false);
    }
  };

  // -----------------------------------------
  // STEP 3 VALIDATION -> SEND OTP
  // -----------------------------------------
  const goToOtpStep = async (e) => {
    if (e) e.preventDefault();
    setStatusMessage({ type: "", text: "" });

    if (!formData.fullName.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter your full name.",
      });
      return;
    }

    if (!formData.age || Number(formData.age) < 10 || Number(formData.age) > 100) {
      setStatusMessage({
        type: "error",
        text: "Please enter a valid age (10 - 100).",
      });
      return;
    }

    if (!formData.weight || Number(formData.weight) < 20 || Number(formData.weight) > 300) {
      setStatusMessage({
        type: "error",
        text: "Please enter a valid weight in kg (20 - 300).",
      });
      return;
    }

    if (!formData.gender) {
      setStatusMessage({
        type: "error",
        text: "Please select your gender for biometric calibration.",
      });
      return;
    }

    await sendOtp();
  };

  // -----------------------------------------
  // CREATE ACCOUNT
  // -----------------------------------------
  const createAccount = async (e) => {
    if (e) e.preventDefault();
    if (formData.otp.trim().length !== 6) {
      setStatusMessage({
        type: "error",
        text: "Please enter the complete 6-digit verification code.",
      });
      return;
    }

    setRegistering(true);
    setStatusMessage({ type: "", text: "" });

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

      const response = await api.post("/api/auth/register", payload);

      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
      }

      setStatusMessage({
        type: "success",
        text: "Account registered successfully! Redirecting to sign in...",
      });

      setTimeout(() => {
        navigate("/Login");
      }, 1200);
    } catch (error) {
      console.error("Registration error:", error);
      setStatusMessage({
        type: "error",
        text: error.response?.data?.message || "Verification failed. Please check your code and try again.",
      });
    } finally {
      setRegistering(false);
    }
  };

  const goBack = () => {
    setStatusMessage({ type: "", text: "" });
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden font-sans text-slate-900 bg-[#FAFAFC] selection:bg-indigo-500 selection:text-white">
      {/* Background Video (Brighter Visibility) */}
      <video
        className="absolute inset-0 h-full w-full object-cover brightness-105"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={Pushups} type="video/mp4" />
      </video>

      {/* Light Frosted Glass Overlay (Transparent & Bright) */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[3px]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-10 w-full border-b border-slate-200/60 bg-white/75 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/Landing_Page" className="flex items-center gap-2.5 group">
            <Logo size="md" variant="primary" showWordmark={true} />
          </Link>
          
          <div className="flex items-center gap-4 text-xs font-mono">
          
            <Link 
              to="/Login" 
              className="text-slate-600 hover:text-slate-900 font-sans text-xs font-medium transition-colors"
            >
              Sign In Instead
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form Center Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Frosted Glass Card */}
          <div className="backdrop-blur-2xl bg-white/90 border border-white shadow-2xl shadow-slate-900/10 rounded-3xl p-8 sm:p-9 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Badge & Title */}
            <div className="text-center mb-6">
            
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Create your account
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
                Setup your profile to calibrate real-time kinematic posture analysis.
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div className="mb-6">
              <div className="mb-2 flex justify-between text-xs text-slate-500 font-mono">
                <span>Step {step} of 4</span>
                <span className="text-indigo-600 font-bold">{step * 25}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${step * 25}%` }}
                />
              </div>
            </div>

            {/* Status / Error Alert */}
            {statusMessage.text && (
              <div className={`mb-5 p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 backdrop-blur-md animate-in fade-in duration-200 ${
                statusMessage.type === "error" 
                  ? "bg-rose-50 border-rose-200 text-rose-800" 
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}>
                {statusMessage.type === "error" ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 1 — EMAIL */}
            {/* ======================================================== */}
            {step === 1 && (
              <form onSubmit={goToPasswordStep} className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      required
                      type="email"
                      name="email"
                      placeholder="athlete@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-3 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all group"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>
            )}

            {/* ======================================================== */}
            {/* STEP 2 — PASSWORD */}
            {/* ======================================================== */}
            {step === 2 && (
              <form onSubmit={goToPersonalDetails} className="space-y-4 animate-in slide-in-from-right-2 duration-200">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Email
                </button>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Create Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      required
                      type="password"
                      name="password"
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Encrypted with secure hash protocols</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-3 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all group"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>
            )}

            {/* ======================================================== */}
            {/* STEP 3 — PERSONAL DETAILS */}
            {/* ======================================================== */}
            {step === 3 && (
              <form onSubmit={goToOtpStep} className="space-y-4 animate-in slide-in-from-right-2 duration-200">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Password
                </button>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      required
                      type="text"
                      name="fullName"
                      placeholder="e.g. Alex Hunter"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Age & Weight */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Age
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        required
                        type="number"
                        name="age"
                        min="10"
                        max="100"
                        placeholder="26"
                        value={formData.age}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Weight (kg)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Scale className="w-4 h-4" />
                      </div>
                      <input
                        required
                        type="number"
                        name="weight"
                        min="20"
                        max="300"
                        step="0.5"
                        placeholder="70"
                        value={formData.weight}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Gender
                  </label>
                  <select
                    required
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={sendingOtp}
                  className="w-full mt-3 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {sendingOtp ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Verification</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ======================================================== */}
            {/* STEP 4 — OTP */}
            {/* ======================================================== */}
            {step === 4 && (
              <form onSubmit={createAccount} className="space-y-4 animate-in slide-in-from-right-2 duration-200">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Details
                </button>

                <div className="text-center p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                  <KeyRound className="w-5 h-5 text-indigo-600 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500">
                    Enter the 6-digit OTP sent to:
                  </p>
                  <p className="text-sm font-semibold text-slate-900 font-mono mt-0.5">
                    {formData.email}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 text-center">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setFormData((prev) => ({ ...prev, otp: val }));
                    }}
                    className="w-full py-3 px-4 text-center font-mono text-2xl font-bold tracking-[0.4em] bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={registering || formData.otp.length !== 6}
                  className="w-full mt-3 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {registering ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Create Account</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    Didn't receive the code?
                  </p>
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={sendingOtp || cooldown > 0}
                    className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${sendingOtp ? "animate-spin" : ""}`} />
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* Login Link */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                to="/Login"
                className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/60 bg-white/75 backdrop-blur-xl px-6 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} SIFRA AI Systems Inc. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-700 cursor-pointer">Security Policy</span>
            <span>&bull;</span>
            <span className="hover:text-slate-700 cursor-pointer">Kinematic ML v2.4</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Register;