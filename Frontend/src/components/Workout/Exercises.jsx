import { useState } from "react";
import { useWorkout } from "../../Context/WorkoutContext";
import { Dumbbell, Plus, Trash2, Layers, CheckCircle } from "lucide-react";

const Exercises = () => {
  const { workouts, addWorkout, deleteWorkout } = useWorkout();

  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");

  const addExercise = async () => {
    if (!exerciseName || !sets || !reps) return;

    await addWorkout(exerciseName, sets, reps);

    setExerciseName("");
    setSets("");
    setReps("");
  };

  const presets = ["Squat", "Pushup", "Plank"];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Workout Plan Builder</h2>
          <p className="text-xs text-slate-500">Configure target exercises, sets, and repetitions</p>
        </div>

        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
          {workouts.length} {workouts.length === 1 ? "Exercise" : "Exercises"}
        </span>
      </div>

      {/* Preset Pills */}
      <div className="mt-5">
        <p className="text-xs font-semibold text-slate-500 mb-2">Supported Exercises:</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setExerciseName(ex)}
              className={`cursor-pointer inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                exerciseName.toLowerCase() === ex.toLowerCase()
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Dumbbell className="h-3.5 w-3.5" />
              <span>{ex}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs Form */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Exercise Name
          </label>
          <input
            type="text"
            placeholder="e.g. Squat"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Sets
          </label>
          <input
            type="number"
            min="1"
            placeholder="3"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Reps
          </label>
          <input
            type="number"
            min="1"
            placeholder="10"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      <button
        onClick={addExercise}
        disabled={!exerciseName || !sets || !reps}
        className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" />
        <span>Add Exercise to Plan</span>
      </button>

      {/* Exercise List */}
      <div className="mt-6 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
        {workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Dumbbell className="h-5 w-5" />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-600">
              No exercises configured yet.
            </p>
            <p className="text-xs text-slate-400">
              Add your first movement above to get started.
            </p>
          </div>
        ) : (
          workouts.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition hover:bg-slate-100/70"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Dumbbell className="h-4 w-4" />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 capitalize">
                    {item.exercise}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {item.sets} Sets • {item.reps} Reps
                  </p>
                </div>
              </div>

              <button
                onClick={() => deleteWorkout(item.id)}
                title="Remove exercise"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Exercises;

