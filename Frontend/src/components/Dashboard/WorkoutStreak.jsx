import React from "react";
import { Flame, Calendar, Trophy, Target } from "lucide-react";

const WorkoutStreak = ({
  currentStreak = 0,
  bestStreak = 0,
  completedDays = 0,
  weeklyGoal = 7,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Flame className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Workout Streak</h3>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            Daily Goal
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          Build long-term training consistency
        </p>
      </div>

      {/* Main Streak Counter */}
      <div className="my-6 flex flex-col items-center justify-center text-center">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-5xl font-extrabold text-slate-900">
            {currentStreak}
          </span>
          <span className="text-sm font-semibold text-slate-500">
            {currentStreak === 1 ? "day" : "days"}
          </span>
        </div>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Current Daily Streak
        </p>
      </div>

      {/* Bottom Summary Grid */}
      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[11px] font-semibold text-slate-500">Best Streak</span>
          </div>
          <p className="mt-1 font-mono text-base font-bold text-slate-900">
            {bestStreak} {bestStreak === 1 ? "Day" : "Days"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400">
            <Target className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-[11px] font-semibold text-slate-500">Weekly Goal</span>
          </div>
          <p className="mt-1 font-mono text-base font-bold text-slate-900">
            {completedDays} / {weeklyGoal}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkoutStreak;

