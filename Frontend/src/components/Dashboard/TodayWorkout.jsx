import React from "react";

const TodayWorkout = ({ workout = [] }) => {
    return (
        <div className="w-[46rem] rounded-3xl bg-white/5
            backdrop-blur-xl
            border
            border-white/10
            shadow-[0_0_30px_rgba(139,92,246,0.15)] p-6 ml-[30rem] mt-8">

            <h1 className="text-3xl font-bold text-white">
                Today's Workout
            </h1>

            <div className="mt-8 space-y-5">

                {workout.map((exercise) => (

                    <div
                        key={exercise.id}
                        className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-5 py-4 hover:bg-violet-500/10 transition-all duration-300"
                    >

                        <div className="flex items-center gap-4">

                            <i
                                className={`${exercise.icon} text-2xl text-violet-500`}
                            ></i>

                            <h2 className="text-xl font-semibold text-white">
                                {exercise.name}
                            </h2>

                        </div>

                        <span className="text-gray-400">
                            {exercise.completedSets} / {exercise.totalSets} Sets
                        </span>

                    </div>

                ))}

            </div>

            <div className="border-t border-white/10 mt-8"></div>

            <button
                className="mt-6 w-full text-violet-400 font-semibold text-lg hover:text-violet-300 transition-all duration-300"
            >
                View Full Plan →
            </button>

        </div>
    );
};

export default TodayWorkout;