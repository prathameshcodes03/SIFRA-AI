import React from 'react'

const WorkoutStreak = ({
    currentStreak = 0,
    bestStreak = 0,
    completedDays = 0,
    weeklyGoal = 7,
}) => {

    return (
   <div className="h-[20rem] w-[30rem] ml-[50rem] mt-[-18rem] rounded-3xl  bg-white/5
            backdrop-blur-xl
            border
            border-white/10
            shadow-[0_0_30px_rgba(139,92,246,0.15)]">

            <div className='flex flex-wrap items-center gap-4'>

                <i className="mt-4 ml-12 font-bold text-3xl text-white fa-regular fa-calendar"></i>

                <h1 className='mt-4 ml-12 font-bold font-serif text-2xl text-white'>
                    Workout Streak
                </h1>

            </div>

            <div className='flex flex-col items-center mt-8'>

                <h1 className='text-7xl font-extrabold text-white'>
                    {currentStreak}
                </h1>

                <p className='text-white/80 mt-2'>
                    Current Streak 
                </p>

            </div>

            <div className='flex justify-around mt-10'>

                <div className='text-center'>

                    <h2 className='text-3xl font-bold text-white'>
                        {bestStreak}
                    </h2>

                    <p className='text-white/70'>
                        Best Streak
                    </p>

                </div>

                <div className='text-center'>

                    <h2 className='text-3xl font-bold text-white'>
                        {completedDays}/{weeklyGoal}
                    </h2>

                    <p className='text-white/70'>
                        Weekly Goal
                    </p>

                </div>

            </div>

        </div>
    )
}

export default WorkoutStreak;