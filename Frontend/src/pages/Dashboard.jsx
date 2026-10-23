import Footer from "../components/Footer";
import AppShell from "../components/Dashboard/AppShell";
import AccuracyCard from "../components/Dashboard/AccuracyCard";
import WorkoutStreak from "../components/Dashboard/WorkoutStreak";
import RecentSessions from "../components/Dashboard/RecentSessions";
import WeeklyActivity from "../components/Dashboard/WeeklyActivity";
import ContinueWorkout from "../components/Dashboard/ContinueWorkout";
import { useWorkout } from "../Context/WorkoutContext";
import { RefreshCw, AlertCircle, Flame, Gauge, Calendar, CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";

const DashboardSkeleton = () => (
  <div className="space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-slate-200" />
        <div className="h-6 w-48 rounded bg-slate-200" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-28 rounded-xl bg-slate-200" />
        <div className="h-9 w-24 rounded-xl bg-slate-200" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
          <div className="h-4 w-20 rounded bg-slate-200" />
          <div className="mt-3 h-8 w-16 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-24 rounded bg-slate-200" />
        </div>
      ))}
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-5 w-32 rounded bg-slate-200" />
        <div className="mt-4 h-16 rounded-xl bg-slate-200" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-5 w-32 rounded bg-slate-200" />
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-10 w-10 rounded-lg bg-slate-200" />
          ))}
        </div>
      </div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-5 w-32 rounded bg-slate-200" />
      <div className="mt-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-3 w-32 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const KpiCard = ({ icon, label, value, accent = "indigo" }) => {
  const Icon = icon;
  const accentMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentMap[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-2 font-mono text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
};

const Dashboard = () => {
  const { stats, workouts, loading, statsError, workoutsError, refreshAll, refreshing } = useWorkout();
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const kpiRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(headerRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
      }
      if (kpiRef.current) {
        gsap.fromTo(kpiRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.1, ease: "power2.out" });
      }
      if (contentRef.current) {
        gsap.fromTo(contentRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.2, ease: "power3.out" });
      }
    });

    return () => ctx.revert();
  }, [loading]);

  if (loading) {
    return (
      <AppShell footer={<Footer />}>
        <DashboardSkeleton />
      </AppShell>
    );
  }

  const hasError = statsError || workoutsError;
  const hasNoData = !stats.hasAccuracyData && stats.totalCompleted === 0 && stats.currentStreak === 0;

  return (
    <AppShell footer={<Footer />}>
      {hasError && (
        <div role="alert" aria-live="assertive" className="mb-5 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1">{statsError || workoutsError}</span>
          <button
            onClick={() => refreshAll()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Retrying..." : "Retry"}</span>
          </button>
        </div>
      )}

      {hasNoData && !hasError && (
        <div className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-center">
          <h3 className="text-lg font-bold text-slate-900">
            Welcome to SIFRA AI!
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            You haven&apos;t completed a workout yet. Add exercises to your plan
            and start your first AI-guided session to track your progress.
          </p>
          <button
            onClick={() => navigate("/WorkoutPlan")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            <span>Set Up Your First Workout</span>
          </button>
        </div>
      )}

      {/* Compact header */}
      <div ref={headerRef} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
            Dashboard
          </p>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Track your training, consistency, and form
          </h1>
          {stats.totalCompleted > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              {stats.totalCompleted} workout{stats.totalCompleted === 1 ? "" : "s"} completed
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/Workout")}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            <span>Start Workout</span>
          </button>
          <button
            onClick={() => navigate("/WorkoutPlan")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span>View Plan</span>
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div ref={kpiRef} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Flame}
          label="Current Streak"
          value={`${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`}
          accent="amber"
        />
        <KpiCard
          icon={Gauge}
          label="Form Accuracy"
          value={stats.hasAccuracyData && stats.accuracy !== null ? `${Math.round(stats.accuracy)}%` : "—"}
          accent="indigo"
        />
        <KpiCard
          icon={Calendar}
          label="Weekly Activity"
          value={`${stats.completedDays} / ${stats.weeklyGoal}`}
          accent="emerald"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Total Workouts"
          value={stats.totalCompleted}
          accent="slate"
        />
      </div>

      {/* Main content grid */}
      <div ref={contentRef} className="mt-5 grid gap-5 lg:grid-cols-2">
        <ContinueWorkout workouts={workouts} loading={false} />
        <WeeklyActivity workouts={workouts} loading={false} />
      </div>

      {/* Recent sessions */}
      <div className="mt-5">
        <RecentSessions workouts={workouts} loading={false} error={workoutsError} />
      </div>
    </AppShell>
  );
};

export default Dashboard;