import React from "react";


const TodayWorkout = ({ workouts }) => {
  return (
    <div
      className="
      w-[46rem]
      rounded-3xl
      bg-white/5
      backdrop-blur-xl
      border
      border-white/10
      shadow-[0_0_30px_rgba(139,92,246,0.15)]
      p-6
      ml-[30rem]
      mt-8
      "
    >
      <h1 className="text-3xl font-bold text-white">
        Today's Workout
      </h1>

      <div className="mt-8 space-y-5">

        {workouts.length === 0 ? (

          <div className="text-center py-10">

            <i className="fa-solid fa-dumbbell text-5xl text-violet-500"></i>

            <p className="text-gray-400 mt-5">
              No workout plan added yet.
            </p>

          </div>

        ) : (

          workouts.map((exercise) => (

            <div
              key={exercise.id}
              className="
              flex
              items-center
              justify-between
              rounded-xl
              bg-white/5
              border
              border-white/10
              px-5
              py-4
              hover:bg-violet-500/10
              transition-all
              duration-300
              "
            >
              <div className="flex items-center gap-4">

                <i className="fa-solid fa-dumbbell text-2xl text-violet-500"></i>

                <div>

                  <h2 className="text-xl font-semibold text-white">
                    {exercise.exercise}
                  </h2>

                  <p className="text-gray-400 text-sm">
                    {exercise.sets} Sets • {exercise.reps} Reps
                  </p>

                </div>

              </div>

              <span
                className="
                px-3
                py-1
                rounded-full
                bg-violet-500/10
                text-violet-400
                text-sm
                "
              >
                Ready
              </span>

            </div>

          ))

        )}

      </div>


 
    </div>
  );
};

export default TodayWorkout;