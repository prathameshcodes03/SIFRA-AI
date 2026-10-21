import React from "react";
import { Gauge, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

const AccuracyCard = ({
  accuracy = null,
  hasAccuracyData = false,
  totalPredictions = 0,
}) => {
  const getQualityText = (acc) => {
    if (acc >= 90) return { label: "Elite Biomechanical Precision", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    if (acc >= 75) return { label: "Good Postural Control", color: "text-indigo-600 bg-indigo-50 border-indigo-200" };
    return { label: "Form Needs Calibration", color: "text-amber-600 bg-amber-50 border-amber-200" };
  };

  // No judged repetition yet: show an honest empty state instead of a
  // fabricated percentage.
  const showEmptyState = !hasAccuracyData || accuracy === null;
  const displayAccuracy = showEmptyState ? 0 : accuracy;
  const quality = getQualityText(displayAccuracy);
  const judgedReps = Number.isFinite(Number(totalPredictions))
    ? Number(totalPredictions)
    : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Gauge className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Form Accuracy</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            ML Vision
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          {showEmptyState
            ? "Evaluated via 33 skeletal joint coordinate landmarks"
            : `Good form across ${judgedReps} judged ${
                judgedReps === 1 ? "repetition" : "repetitions"
              }`}
        </p>
      </div>

      {/* Metric Gauge Display */}
      <div className="my-6 flex flex-col items-center justify-center">
        <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-8 border-slate-100 bg-slate-50/50">
          <svg className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="72"
              cy="72"
              r="60"
              className="text-slate-100"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="72"
              cy="72"
              r="60"
              className="text-indigo-600 transition-all duration-1000 ease-out"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 60}
              strokeDashoffset={2 * Math.PI * 60 * (1 - displayAccuracy / 100)}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          <div className="flex flex-col items-center text-center">
            {showEmptyState ? (
              <>
                <span className="text-xl font-extrabold text-slate-400">--</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  No Data
                </span>
              </>
            ) : (
              <>
                <span className="font-mono text-3xl font-extrabold text-slate-900">
                  {displayAccuracy}%
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Precision
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quality Pill */}
      {showEmptyState ? (
        <div className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>No workout data yet</span>
        </div>
      ) : (
        <div className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-xs font-semibold ${quality.color}`}>
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>{quality.label}</span>
        </div>
      )}
    </div>
  );
};

export default AccuracyCard;

