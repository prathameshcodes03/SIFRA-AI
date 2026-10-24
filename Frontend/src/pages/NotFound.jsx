import { useNavigate } from "react-router-dom";
import { ArrowLeft, Dumbbell, LayoutDashboard, Home } from "lucide-react";
import Logo from "../components/Logo";
import { useAuth } from "../Context/AuthContext";

const HOME_ROUTE = "/";
const LANDING_ROUTE = "/Landing_Page";
const DASHBOARD_ROUTE = "/Dashboard";

export default function NotFound() {
  const navigate = useNavigate();
  const authContext = useAuth();
  const user = authContext?.user;
  const authed = Boolean(user || localStorage.getItem("user"));

  const handleGoHome = () => {
    navigate(authed ? DASHBOARD_ROUTE : HOME_ROUTE);
  };

  const handleLandingPage = () => {
    navigate(LANDING_ROUTE);
  };

  const handleGoBack = () => {
    if (
      typeof window !== "undefined" &&
      window.history.state &&
      typeof window.history.state.idx === "number" &&
      window.history.state.idx > 0
    ) {
      navigate(-1);
    } else {
      navigate(authed ? DASHBOARD_ROUTE : HOME_ROUTE, { replace: true });
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col bg-[#f1f2f6] text-[#12121a] font-['Inter',system-ui,sans-serif] px-[clamp(20px,5vw,72px)] pb-[clamp(28px,5vw,56px)] pt-0"
      aria-labelledby="nf-title"
    >
      <header className="py-7">
        <span className="inline-flex bg-[#0a0a12] rounded-full py-2 pr-[18px] pl-2.5">
          <Logo size={38} animated={false} variant="dark" />
        </span>
      </header>

      <div className="flex-1 flex items-center">
        <p
          className="m-0 font-['Space_Grotesk',system-ui,sans-serif] font-bold text-[clamp(7rem,30vw,27rem)] leading-[0.82] tracking-[-0.07em] flex items-end select-none"
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

      <hr className="border-0 border-t border-[#12121a]/15 m-0" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-[clamp(20px,5vw,72px)] pt-7 animate-[nf-fade_0.7s_ease_1.1s_both] motion-reduce:animate-none">
        <h1
          id="nf-title"
          className="m-0 font-['Space_Grotesk',system-ui,sans-serif] font-semibold text-[clamp(1.8rem,4.2vw,3.2rem)] leading-[1.05] tracking-[-0.03em]"
        >
          <span className="sr-only">Error 404. </span>
          Page not found
        </h1>
        <div>
          <p className="m-0 text-[#555768] leading-[1.65] text-[1.0625rem] max-w-[44ch]">
            We couldn't find anything at this address. It may have moved, or the link may be mistyped.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              className="inline-flex items-center gap-2.5 h-[46px] px-5 rounded-[10px] font-['Inter',system-ui,sans-serif] font-medium text-[0.95rem] cursor-pointer border-[1.5px] border-[#12121a] bg-[#12121a] text-white transition-all duration-[180ms] ease-out hover:bg-[#4f46e5] hover:border-[#4f46e5] focus-visible:outline-3 focus-visible:outline-[#4f46e5] focus-visible:outline-offset-[3px] active:translate-y-[1px]"
              onClick={handleGoHome}
            >
              {authed ? <LayoutDashboard size={18} aria-hidden="true" /> : <Home size={18} aria-hidden="true" />}
              {authed ? "Go to Dashboard" : "Go to Home"}
            </button>
            <button
              className="inline-flex items-center gap-2.5 h-[46px] px-5 rounded-[10px] font-['Inter',system-ui,sans-serif] font-medium text-[0.95rem] cursor-pointer border-[1.5px] border-[#12121a] bg-transparent text-[#12121a] transition-all duration-[180ms] ease-out hover:bg-[#12121a] hover:text-white focus-visible:outline-3 focus-visible:outline-[#4f46e5] focus-visible:outline-offset-[3px] active:translate-y-[1px]"
              onClick={handleLandingPage}
            >
              <Home size={18} aria-hidden="true" />
              Landing Page
            </button>
            <button
              className="inline-flex items-center gap-2.5 h-[46px] px-5 rounded-[10px] font-['Inter',system-ui,sans-serif] font-medium text-[0.95rem] cursor-pointer border-[1.5px] border-[#12121a] bg-transparent text-[#12121a] transition-all duration-[180ms] ease-out hover:bg-[#12121a] hover:text-white focus-visible:outline-3 focus-visible:outline-[#4f46e5] focus-visible:outline-offset-[3px] active:translate-y-[1px]"
              onClick={handleGoBack}
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
