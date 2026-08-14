import { useState } from "react";
import { useWorkout } from "../../Context/WorkoutContext";

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

  return (
    <div
      className="
            w-full
            max-w-none
            rounded-2xl
            bg-white/5
            backdrop-blur-xl
            border
            border-white/10
            shadow-[0_0_25px_rgba(139,92,246,0.12)]
            p-5
            "
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-white">Workout Plan</h2>

        <span className="text-sm text-violet-400">
          {workouts.length} Exercise{workouts.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Exercise"
          value={exerciseName}
          onChange={(e) => setExerciseName(e.target.value)}
          className="col-span-2 h-11 rounded-lg bg-white/5 border border-white/10 px-3 text-white placeholder:text-gray-500 outline-none focus:border-violet-500"
        />

        <input
          type="number"
          placeholder="Sets"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          className="h-11 rounded-lg bg-white/5 border border-white/10 px-3 text-white outline-none focus:border-violet-500"
        />

        <input
          type="number"
          placeholder="Reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="h-11 rounded-lg bg-white/5 border border-white/10 px-3 text-white outline-none focus:border-violet-500"
        />
      </div>

      <button
        onClick={addExercise}
        className="mt-4 w-full h-10 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:opacity-90 transition-all duration-300"
      >
        <i className="fa-solid fa-plus mr-2"></i>
        Add Exercise
      </button>

      <div className="mt-5 space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <i className="fa-solid fa-dumbbell text-4xl text-violet-500"></i>

            <p className="text-gray-400 text-sm mt-3">
              No exercises added yet.
            </p>
          </div>
        ) : (
          workouts.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-violet-500/10 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center">
                  <i className="fa-solid fa-dumbbell text-violet-400"></i>
                </div>

                <div>
                  <h3 className="text-white font-medium">{item.exercise}</h3>

                  <p className="text-xs text-gray-400">
                    {item.sets} Sets • {item.reps} Reps
                  </p>
                </div>
              </div>

              <button
                onClick={() => deleteWorkout(item.id)}
                className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300"
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Exercises;
