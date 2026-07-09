import axios from "axios";
import { useState } from "react";

const Exercises = ({ workouts, fetchWorkouts }) => {

  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");

  const addExercise = async () => {

    if (!exerciseName || !sets || !reps) return;

    try {

      await axios.post(
        "http://localhost:3000/api/workouts",
        {
          exercise: exerciseName,
          sets,
          reps,
        },
        {
          withCredentials: true,
        }
      );

      setExerciseName("");
      setSets("");
      setReps("");

      fetchWorkouts();

    } catch (error) {
      console.log(error);
    }
  };

  const deleteExercise = async (id) => {

    try {

      await axios.delete(
        `http://localhost:3000/api/workouts/${id}`,
        {
          withCredentials: true,
        }
      );

      fetchWorkouts();

    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="w-[60rem] rounded-2xl mt-[-42rem] ml-[20rem] bg-[#11111B] border border-white/10 p-5">

      <h2 className="text-white text-xl font-semibold mb-5">
        Workout Plan
      </h2>

      <div className="grid grid-cols-4 gap-3">

        <input
          type="text"
          placeholder="Exercise"
          value={exerciseName}
          onChange={(e) => setExerciseName(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white outline-none cursor-pointer"
        />

        <input
          type="number"
          placeholder="Sets"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white outline-none cursor-pointer"
        />

        <input
          type="number"
          placeholder="Reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white outline-none cursor-pointer"
        />

        <button
          onClick={addExercise}
          className="
          cursor-pointer
          rounded-xl
          bg-gradient-to-r
          from-violet-600
          to-purple-600
          text-white
          hover:scale-105
          duration-300
          "
        >
          <i className="fa-solid fa-plus mr-2"></i>
          Add
        </button>

      </div>

      <div className="mt-6 space-y-3">

        {workouts.length === 0 ? (

          <div className="text-center text-gray-400 py-8">
            No exercises added yet.
          </div>

        ) : (

          workouts.map((item) => (

            <div
              key={item.id}
              className="
              flex
              justify-between
              items-center
              bg-white/5
              border
              border-white/10
              rounded-xl
              px-5
              py-4
              "
            >

              <div>

                <h3 className="text-white font-semibold">
                  {item.exercise}
                </h3>

                <p className="text-gray-400">
                  {item.sets} Sets • {item.reps} Reps
                </p>

              </div>

              <button
                onClick={() => deleteExercise(item.id)}
                className="
                h-10
                w-10
                rounded-lg
                bg-red-500/20
                text-red-400
                hover:bg-red-500
                hover:text-white
                duration-300
                "
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