import { useWorkout } from "../../context/WorkoutContext";

const TodayWorkout = () => {

    const { workouts } = useWorkout();

    return (

        <div
            className="
            w-full
            ml-[28rem]
            mt-[2rem]
            max-w-xl
            rounded-2xl
            bg-white/5
            backdrop-blur-xl
            border
            border-white/10
            shadow-[0_0_25px_rgba(139,92,246,0.12)]
            p-5
            "
        >

            <div className="flex items-center justify-between">

                <h1 className="text-2xl font-bold text-white">
                    Today's Workout
                </h1>

                <span className="text-sm text-violet-400">
                    {workouts.length} Exercise{workouts.length !== 1 ? "s" : ""}
                </span>

            </div>

            <div className="mt-5 space-y-3">

                {workouts.length === 0 ? (

                    <div className="flex flex-col items-center justify-center py-8">

                        <i className="fa-solid fa-dumbbell text-4xl text-violet-500"></i>

                        <p className="text-gray-400 text-sm mt-3">
                            No workout plan added yet.
                        </p>

                    </div>

                ) : (

                    workouts.map((exercise) => (

                        <div
                            key={exercise.id}
                            className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-violet-500/10 transition-all duration-300"
                        >

                            <div className="flex items-center gap-3">

                                <div className="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center">

                                    <i className="fa-solid fa-dumbbell text-violet-400"></i>

                                </div>

                                <div>

                                    <h2 className="text-base font-semibold text-white">
                                        {exercise.exercise}
                                    </h2>

                                    <p className="text-xs text-gray-400">
                                        {exercise.sets} Sets • {exercise.reps} Reps
                                    </p>

                                </div>

                            </div>

                            <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
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