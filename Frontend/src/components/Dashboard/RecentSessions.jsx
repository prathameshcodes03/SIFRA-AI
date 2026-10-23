import { Dumbbell, CheckCircle2, Activity } from "lucide-react";

const exerciseIcon = (exercise) => {
  const name = (exercise || "").toLowerCase();
  if (name.includes("squat")) return <Dumbbell className="h-4 w-4 text-indigo-600" />;
  if (name.includes("push")) return <Activity className="h-4 w-4 text-indigo-600" />;
  if (name.includes("plank")) return <Dumbbell className="h-4 w-4 text-indigo-600" />;
  return <Dumbbell className="h-4 w-4 text-indigo-600" />;
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const formatTime = (value) => {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const RecentSessions = ({ workouts = [], loading = false, error = null }) => {
  // Filter to completed workouts only, sort by completedAt (or createdAt) desc
  const completed = (workouts || [])
    .filter((w) => w && w.completed)
    .sort((a, b) => {
      const dateA = new Date(a.completedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.completedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 h-5 w-40 rounded bg-slate-200 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-3 w-32 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <p className="text-sm font-medium text-rose-700">{error}</p>
      </div>
    );
  }

  if (completed.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">Recent Sessions</h3>
        <p className="mt-2 text-sm text-slate-500">
          Your completed workout sessions will appear here after your first session.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">Recent Sessions</h3>
      <p className="mt-1 text-xs text-slate-500">
        Your last {completed.length} completed workout{completed.length === 1 ? "" : "s"}
      </p>
      <div className="mt-4 divide-y divide-slate-100">
        {completed.map((w) => {
          // icon rendered below
          const dateStr = formatDate(w.completedAt || w.createdAt);
          const timeStr = formatTime(w.completedAt || w.createdAt);
          return (
            <div key={w.id} className="flex items-center gap-3 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                {exerciseIcon(w.exercise)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 capitalize">
                  {w.exercise || "Workout"}
                </p>
                <p className="text-xs text-slate-500">
                  {dateStr}
                  {timeStr ? ` at ${timeStr}` : ""}
                  {w.sets ? ` · ${w.sets} sets` : ""}
                  {w.reps ? ` × ${w.reps} reps` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {w.accuracy != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    {Math.round(w.accuracy)}%
                  </span>
                )}
                {w.accuracy == null && (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentSessions;