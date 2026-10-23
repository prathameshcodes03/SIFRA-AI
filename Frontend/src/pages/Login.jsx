import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../Context/AuthContext";
import Pushups from "../assets/Videos/Pushups.mp4";
import { 
  Activity, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles,
  Zap
} from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const loginResponse = await api.post("/api/auth/login", formData);
      const currentUserResponse = await api.get("/api/auth/me");

      login(currentUserResponse.data.user, loginResponse.data.token);
      setMessage(loginResponse.data.message || "Login successful! Redirecting...");
      setIsError(false);
      navigate("/Dashboard");
    } catch (error) {
      setIsError(true);
      setMessage(
        error.response?.data?.message || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
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

      {/* Light Frosted Overlay (Transparent & Bright) */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[3px]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-10 w-full border-b border-slate-200/60 bg-white/75 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/Landing_Page" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-900">
                SIFRA
              </span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                AI
              </span>
            </div>
          </Link>
          
          <div className="flex items-center gap-4 text-xs font-mono">
      
            <Link 
              to="/" 
              className="text-slate-600 hover:text-slate-900 font-sans text-xs font-medium transition-colors"
            >
              Back to Home
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
            <div className="text-center mb-8">
             
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">
                Sign in to continue real-time posture tracking & voice coaching.
              </p>
            </div>

            {/* Error / Feedback Banner */}
            {message && (
              <div className={`mb-6 p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 backdrop-blur-md animate-in fade-in duration-200 ${
                isError 
                  ? "bg-rose-50 border-rose-200 text-rose-800" 
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}>
                {isError ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <span>{message}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
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
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

    

            {/* Register Link */}
            <div className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                to="/Register"
                className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Create an account
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

export default Login;
