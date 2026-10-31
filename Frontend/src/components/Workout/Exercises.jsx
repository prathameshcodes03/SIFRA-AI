import { useState } from "react";
import { useWorkout } from "../../Context/WorkoutContext";
import { Dumbbell, Plus, Trash2, Layers, CheckCircle, AlertCircle } from "lucide-react";

const SUPPORTED_EXERCISES = ["squat", "pushup", "plank"];

const Exercises = () => {
  const { planWorkouts, addWorkout, deleteWorkout } = useWorkout();

  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [invalidExercise, setInvalidExercise] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const addExercise = async () => {
    if (!exerciseName || !sets || !reps) return;

    const normalized = exerciseName.trim().toLowerCase();
    if (!SUPPORTED_EXERCISES.includes(normalized)) {
      setInvalidExercise(exerciseName.trim());
      return;
    }
    setInvalidExercise("");
    setActionError("");
    setActionSuccess("");

    setSubmitting(true);
    try {
      await addWorkout(exerciseName.trim(), sets, reps);
      setActionSuccess("Exercise added to your plan.");
      setExerciseName("");
      setSets("");
      setReps("");
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "Could not add exercise. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setActionError("");
    setActionSuccess("");
    try {
      await deleteWorkout(id);
      setActionSuccess("Exercise removed from your plan.");
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "Could not remove exercise. Please try again."
      );
    }
  };

  const presets = ["Squat", "Pushup", "Plank"];

  return (
    <div className="sifra-card">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Workout Plan Builder</h2>
          <p className="text-xs text-slate-500">Configure target exercises, sets, and repetitions</p>
        </div>

        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
          {planWorkouts.length} {planWorkouts.length === 1 ? "Exercise" : "Exercises"}
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
            className="w-full sifra-input"
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
            className="w-full sifra-input"
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
            className="w-full sifra-input"
          />
        </div>
      </div>

      <button
        onClick={addExercise}
        disabled={!exerciseName || !sets || !reps || submitting}
        className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
      >
        {submitting ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        <span>{submitting ? "Adding..." : "Add Exercise to Plan"}</span>
      </button>

      {actionError && (
        <div role="alert" className="sifra-banner sifra-banner-error mt-3">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{actionError}</span>
          </span>
        </div>
      )}

      {actionSuccess && (
        <div role="status" className="sifra-banner sifra-banner-success mt-3">
          {actionSuccess}
        </div>
      )}

      {invalidExercise && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              "{invalidExercise}" is not supported. Choose Squat, Pushup, or
              Plank.
            </span>
          </span>
        </div>
      )}

      {/* Exercise List */}
      <div className="mt-6 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
        {planWorkouts.length === 0 ? (
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
          planWorkouts.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition hover:bg-slate-100/70"
              aria-label={`${item.exercise}, ${item.sets} sets, ${item.reps} repetitions${item.completed ? ', completed today' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Dumbbell className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 capitalize truncate">
                    {item.exercise}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    {item.sets} Sets • {item.reps} Reps
                    {item.completed ? " • Done today" : ""}
                  </p>
                </div>
              </div>

              {/* A finished workout is HISTORY - it is what the streak and the
                  accuracy are made of - so it cannot be removed from the
                  plan. Only an outstanding exercise can be deleted. */}
              {!item.completed && (
                <button
                  onClick={() => handleDelete(item.id)}
                  title="Remove exercise"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Exercises;

