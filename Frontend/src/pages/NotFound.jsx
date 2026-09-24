import { useNavigate, Link } from "react-router-dom";
import { Activity, ArrowLeft, Home, LayoutDashboard, Shield, Sparkles } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAFC] font-sans antialiased text-slate-900 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/Landing_Page" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                SIFRA <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">AI</span>
              </span>
            </div>
          </Link>
          
          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              ERR 0x404
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />

        <div className="relative max-w-lg w-full text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            Route Not Found
          </div>

          {/* 404 Display */}
          <div className="text-7xl sm:text-9xl font-black tracking-tighter text-slate-900 mb-2 font-mono flex items-center justify-center gap-2">
            <span>4</span>
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-3xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center shadow-inner text-indigo-600">
              <Activity className="w-10 h-10 sm:w-14 sm:h-14 animate-pulse stroke-[2]" />
            </div>
            <span>4</span>
          </div>

          {/* Heading & Details */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-4">
            Out of Kinematic Range
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-md mx-auto leading-relaxed">
            The requested trajectory or resource does not exist in our kinematic graph. Let's redirect you back to your active training station.
          </p>

          {/* Navigation Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous Page
            </button>

            <Link
              to="/Dashboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
            </Link>

            <Link
              to="/Landing_Page"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Landing Page
            </Link>
          </div>

          {/* Telemetry Row */}
          <div className="mt-12 pt-6 border-t border-slate-200/80 flex items-center justify-center gap-6 text-xs text-slate-400 font-mono">
            <span>SYS: ONLINE</span>
            <span>&bull;</span>
            <span className="text-emerald-600 font-semibold">POSE PIPELINE: ACTIVE</span>
            <span>&bull;</span>
            <span>BUILD: v2.4.0</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/50 px-6 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} SIFRA AI Systems Inc. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-600 cursor-pointer">Telemetry Logs</span>
            <span>&bull;</span>
            <span className="hover:text-slate-600 cursor-pointer">Support Portal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
