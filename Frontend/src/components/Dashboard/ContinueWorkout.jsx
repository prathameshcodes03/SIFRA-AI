import { useNavigate } from "react-router-dom";
import { Play, ClipboardList, CheckCircle2 } from "lucide-react";
import { selectPlanWorkouts } from "../../exercises/workoutPlan";

const ContinueWorkout = ({ workouts = [], loading = false }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="mt-4 h-16 rounded-xl bg-slate-200" />
      </div>
    );
  }

  const plan = selectPlanWorkouts(workouts || []);
  const nextExercise = plan.find((w) => !w.completed) || null;
  const allComplete = plan.length > 0 && plan.every((w) => w.completed);

  if (plan.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No workout plan yet</h3>
            <p className="text-xs text-slate-500">Create your first plan to get started.</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/WorkoutPlan")}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98]"
        >
          <span>Create Workout Plan</span>
        </button>
      </div>
    );
  }

  if (allComplete) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">All done for today!</h3>
            <p className="text-xs text-slate-500">Great work. Come back tomorrow.</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/WorkoutPlan")}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
        >
          <span>View Plan</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Play className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Continue Training</h3>
          <p className="text-xs text-slate-500">
            {nextExercise.exercise} — {nextExercise.sets} sets × {nextExercise.reps} reps
          </p>
        </div>
      </div>
      <button
        onClick={() =>
          navigate(
            `/Workout?exercise=${encodeURIComponent(
              nextExercise.exercise.toLowerCase()
            )}&workoutId=${nextExercise.id}&sets=${nextExercise.sets}&reps=${nextExercise.reps}`
          )
        }
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98]"
      >
        <span>Start Exercise</span>
        <Play className="h-4 w-4 fill-white" />
      </button>
    </div>
  );
};

export default ContinueWorkout;