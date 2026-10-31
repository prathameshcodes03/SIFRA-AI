import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Dumbbell, LayoutDashboard, Home } from "lucide-react";
import Logo from "../components/Logo";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../Context/AuthContext";

const HOME_ROUTE = "/";
const LANDING_ROUTE = "/";

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const authed = Boolean(user);

  const handleGoBack = () => {
    if (
      typeof window !== "undefined" &&
      window.history.state &&
      typeof window.history.state.idx === "number" &&
      window.history.state.idx > 0
    ) {
      navigate(-1);
    } else {
      navigate(authed ? "/Dashboard" : HOME_ROUTE, { replace: true });
    }
  };

  return (
    <>
      <Navbar />
      <a href="#nf-main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Skip to main content
      </a>
      <main
        id="nf-main"
        tabIndex={-1}
        className="min-h-screen flex flex-col bg-[#f7f5ff] text-[#19152b] antialiased selection:bg-violet-200 selection:text-violet-950 px-[clamp(20px,5vw,72px)] pb-[clamp(28px,5vw,56px)] pt-0"
        aria-labelledby="nf-title"
      >
      

        <div className="flex-1 flex items-center">
          <p
            className="m-0 font-['Plus Jakarta Sans',system-ui,sans-serif] font-bold text-[clamp(7rem,30vw,27rem)] leading-[0.82] tracking-[-0.07em] flex items-end select-none"
            aria-hidden="true"
          >
            <span className="inline-block overflow-hidden pt-[0.06em] px-[0.02em] pb-0 -mt-[0.06em]">
              <span
                className="inline-block animate-[nf-rise_0.9s_cubic-bezier(0.2,0.8,0.2,1)_both] motion-reduce:animate-none"
                style={{ animationDelay: "0ms" }}
              >
                4
              </span>
            </span>
            <span className="inline-block overflow-hidden pt-[0.06em] px-[0.02em] pb-0 -mt-[0.06em]">
              <span
                className="inline-block animate-[nf-rise_0.9s_cubic-bezier(0.2,0.8,0.2,1)_both] motion-reduce:animate-none"
                style={{ animationDelay: "90ms" }}
              >
                <span className="relative inline-block box-border w-[0.66em] h-[0.66em] border-[0.1em] border-[#12121a] rounded-full mx-[0.06em] mb-[0.015em] align-baseline">
                  <span className="absolute inset-0 flex items-center justify-center text-[#4f46e5] animate-[nf-pop_0.7s_cubic-bezier(0.2,0.8,0.2,1)_1.1s_both] motion-reduce:animate-none">
                    <span className="block leading-none w-[0.3em] h-[0.3em] tracking-normal">
                      <Dumbbell size="100%" strokeWidth={1.7} className="block" />
                    </span>
                  </span>
                  <span className="absolute -inset-[0.1em] animate-[nf-spin_1.5s_cubic-bezier(0.3,0.7,0.2,1)_0.75s_both] motion-reduce:animate-none">
                    <span className="absolute left-1/2 top-0 w-[0.11em] h-[0.11em] rounded-full bg-[#4f46e5] -translate-x-1/2 -translate-y-1/2" />
                  </span>
                </span>
              </span>
            </span>
            <span className="inline-block overflow-hidden pt-[0.06em] px-[0.02em] pb-0 -mt-[0.06em]">
              <span
                className="inline-block animate-[nf-rise_0.9s_cubic-bezier(0.2,0.8,0.2,1)_both] motion-reduce:animate-none"
                style={{ animationDelay: "180ms" }}
              >
                4
              </span>
            </span>
          </p>
        </div>

        <hr className="border-0 border-t border-[#a78bfa]/20 m-0" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-[clamp(20px,5vw,72px)] pt-7 animate-[nf-fade_0.7s_ease_1.1s_both] motion-reduce:animate-none">
          <h1
            id="nf-title"
            className="m-0 font-['Plus Jakarta Sans',system-ui,sans-serif] font-semibold text-[clamp(1.8rem,4.2vw,3.2rem)] leading-[1.05] tracking-[-0.03em]"
          >
            <span className="sr-only">Error 404. </span>
            Page not found
          </h1>
          <div>
            <p className="m-0 text-slate-600 leading-[1.65] text-[1.0625rem] max-w-[44ch]">
              We couldn't find anything at this address. It may have moved, or the link may be mistyped.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                to={authed ? "/Dashboard" : "/"}
                className="inline-flex items-center gap-2.5 h-[46px] px-5 rounded-[10px] font-['Plus Jakarta Sans',system-ui,sans-serif] font-medium text-[0.95rem] cursor-pointer border-[1.5px] border-[#12121a] bg-[#12121a] text-white transition-all duration-[180ms] ease-out hover:bg-[#4f46e5] hover:border-[#4f46e5] focus-visible:outline-3 focus-visible:outline-[#4f46e5] focus-visible:outline-offset-[3px] active:translate-y-[1px]"
              >
                {authed ? <LayoutDashboard size={18} aria-hidden="true" /> : <Home size={18} aria-hidden="true" />}
                {authed ? "Go to Dashboard" : "Go to Home"}
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2.5 h-[46px] px-5 rounded-[10px] font-['Plus Jakarta Sans',system-ui,sans-serif] font-medium text-[0.95rem] cursor-pointer border-[1.5px] border-[#12121a] bg-transparent text-[#12121a] transition-all duration-[180ms] ease-out hover:bg-[#12121a] hover:text-white focus-visible:outline-3 focus-visible:outline-[#4f46e5] focus-visible:outline-offset-[3px] active:translate-y-[1px]"
              >
                <Home size={18} aria-hidden="true" />
                Landing Page
              </Link>
              <button
                className="inline-flex items-center gap-2.5 h-[46px] px-5 rounded-[10px] font-['Plus Jakarta Sans',system-ui,sans-serif] font-medium text-[0.95rem] cursor-pointer border-[1.5px] border-[#12121a] bg-transparent text-[#12121a] transition-all duration-[180ms] ease-out hover:bg-[#12121a] hover:text-white focus-visible:outline-3 focus-visible:outline-[#4f46e5] focus-visible:outline-offset-[3px] active:translate-y-[1px]"
                onClick={handleGoBack}
              >
                <ArrowLeft size={18} aria-hidden="true" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
