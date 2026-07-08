import React, { useState } from "react";

const Exercises = () => {

  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");

  const [exercises, setExercises] = useState([]);

  const addExercise = () => {

    if (!exerciseName || !sets || !reps) return;

    const newExercise = {
      id: Date.now(),
      exercise: exerciseName,
      sets: Number(sets),
      reps: Number(reps),
    };

    setExercises([...exercises, newExercise]);

    setExerciseName("");
    setSets("");
    setReps("");
  };

  const deleteExercise = (id) => {
    setExercises(exercises.filter((item) => item.id !== id));
  };

  return (
    <div className="w-[60rem] rounded-2xl mt-[-42rem] ml-[20rem] bg-[#11111B] border border-white/10 p-5">

      <h2 className="text-white text-xl font-semibold mb-5">
        Workout Plan
      </h2>

      {/* Inputs */}

      <div className="grid grid-cols-4 gap-3">

        <input
          type="text"
          placeholder="Exercise"
          value={exerciseName}
          onChange={(e) => setExerciseName(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white outline-none"
        />

        <input
          type="number"
          placeholder="Sets"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white outline-none"
        />

        <input
          type="number"
          placeholder="Reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white outline-none"
        />

        <button
          onClick={addExercise}
          className="
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

      {/* Exercise List */}

      <div className="mt-6 space-y-3">

        {exercises.map((item) => (

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

        ))}

      </div>

    </div>
  );
};

export default Exercises;