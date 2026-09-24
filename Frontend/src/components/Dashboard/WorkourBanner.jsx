import { useNavigate } from "react-router-dom";
import { Play, Sparkles, Dumbbell, ArrowRight } from "lucide-react";

const WorkourBanner = () => {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {/* Background Subtle Gradient & Grid Accent */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-50/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-16 h-64 w-64 rounded-full bg-sky-50/60 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-10" />

      <div className="relative flex flex-col justify-between h-full max-w-xl">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Real-Time Biomechanical Intelligence</span>
          </div>

          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Ready for your workout session?
          </h2>

          <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
            SIFRA analyzes your joint angles at 60 FPS in real time, corrects your form with instant audio feedback, and counts reps automatically.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("/WorkoutPlan")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-[0.98]"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Launch Workout Session</span>
          </button>

          <button
            onClick={() => navigate("/WorkoutPlan")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <span>Customize Plan</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default WorkourBanner;

