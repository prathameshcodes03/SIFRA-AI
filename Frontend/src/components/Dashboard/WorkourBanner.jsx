import DashboardImage from "../../assets/Images/dashboard.jpg";
import { useNavigate } from "react-router-dom";

const WorkourBanner = () => {
  const navigate = useNavigate();
  return <section className="relative min-h-[22rem] overflow-hidden rounded-3xl border border-violet-400/20 bg-cover bg-center p-6 shadow-[0_0_35px_rgba(139,92,246,0.12)] sm:p-9" style={{ backgroundImage: `url(${DashboardImage})` }}>
    <div className="absolute inset-0 bg-gradient-to-r from-[#090710]/95 via-[#090710]/75 to-[#090710]/20" />
    <div className="relative flex h-full max-w-md flex-col justify-end"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-violet-200">Live form intelligence</p><h1 className="text-[clamp(1.9rem,4vw,3rem)] font-bold text-white">Ready for a workout?</h1><p className="mt-3 max-w-sm text-sm leading-6 text-white/70 sm:text-base">AI analyzes your form in real time and helps you move with more confidence.</p><button onClick={() => navigate("/Workout")} className="mt-7 min-h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 font-semibold text-white transition hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(139,92,246,.45)] active:scale-[.98] sm:w-44">Start workout</button></div>
  </section>;
};
export default WorkourBanner;
