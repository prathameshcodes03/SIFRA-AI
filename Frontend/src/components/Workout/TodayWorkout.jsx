import { useNavigate } from "react-router-dom";
import { useWorkout } from "../../Context/WorkoutContext";
import { Dumbbell, Play, RotateCcw, CheckCircle2, Flame, ArrowRight } from "lucide-react";

const TodayWorkout = () => {
  const { workouts, setActiveWorkout } = useWorkout();
  const navigate = useNavigate();

  const handleStartWorkout = (exercise) => {
    setActiveWorkout(exercise);
    navigate(
      `/Workout?exercise=${encodeURIComponent(
        exercise.exercise.toLowerCase()
      )}&workoutId=${exercise.id}&sets=${exercise.sets}&reps=${exercise.reps}`
    );
  };

  const completedCount = workouts.filter((w) => w.completed).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Today&apos;s Workout Queue</h2>
          <p className="text-xs text-slate-500">
            {completedCount} of {workouts.length} completed
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Queue: {workouts.length}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Dumbbell className="h-5 w-5" />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-600">
              No workout plan queued.
            </p>
            <p className="text-xs text-slate-400">
              Add exercises using the builder on the left to start.
            </p>
          </div>
        ) : (
          workouts.map((exercise) => (
            <div
              key={exercise.id}
              className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                exercise.completed
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    exercise.completed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-indigo-50 text-indigo-600"
                  }`}
                >
                  <Dumbbell className="h-5 w-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold capitalize text-slate-900">
                      {exercise.exercise}
                    </h3>
                    {exercise.completed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" />
                        Done {exercise.accuracy ? `(${exercise.accuracy}%)` : ""}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    Target: {exercise.sets} Sets • {exercise.reps} Reps
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleStartWorkout(exercise)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] ${
                  exercise.completed
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700"
                }`}
              >
                {exercise.completed ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                    <span>Restart</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-white" />
                    <span>Launch</span>
                  </>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TodayWorkout;


