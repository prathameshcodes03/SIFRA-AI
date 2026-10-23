import { Calendar } from "lucide-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getWeekDays = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  // Monday = 0 offset
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
};

const isSameDay = (dateA, dateB) => {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
};

const WeeklyActivity = ({ workouts = [], loading = false }) => {
  const weekDays = getWeekDays();
  const today = new Date();

  // Count completed workouts per day
  const activeDays = weekDays.map((day) => {
    const hasWorkout = (workouts || []).some((w) => {
      if (!w || !w.completed) return false;
      const completedDate = new Date(w.completedAt || w.createdAt);
      return isSameDay(completedDate, day);
    });
    return { date: day, active: hasWorkout };
  });

  const activeCount = activeDays.filter((d) => d.active).length;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-5 w-36 rounded bg-slate-200" />
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-10 w-10 rounded-lg bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Calendar className="h-4 w-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Weekly Activity</h3>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {activeCount} active day{activeCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        {activeDays.map((day, i) => {
          const isToday = isSameDay(day.date, today);
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold transition-all duration-300 ${
                  day.active
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                    : isToday
                    ? "border-2 border-indigo-300 bg-indigo-50 text-indigo-600"
                    : "bg-slate-100 text-slate-400"
                }`}
                aria-label={`${DAY_LABELS[i]}: ${day.active ? "active" : "inactive"}${isToday ? " (today)" : ""}`}
              >
                {day.active ? "✓" : DAY_LABELS[i].charAt(0)}
              </div>
              <span className={`text-[10px] font-medium ${isToday ? "text-indigo-600" : "text-slate-400"}`}>
                {DAY_LABELS[i]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {activeCount === 0
          ? "No workouts this week yet. Start your first session to build momentum."
          : activeCount === 7
          ? "Perfect week! You trained every day."
          : `${activeCount} of 7 days active this week.`}
      </p>
    </div>
  );
};

export default WeeklyActivity;