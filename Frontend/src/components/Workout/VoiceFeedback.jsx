import React from "react";
import { Volume2, VolumeX, Sparkles, RefreshCw, Mic } from "lucide-react";

const VoiceFeedback = ({
  message = "AI Voice Coach is ready. Keep your back straight.",
  isSpeaking = false,
  isLoading = false,
  isMuted = false,
  onToggleMute,
  onReplay,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3.5 flex-1 min-w-[220px]">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
            isSpeaking
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
              : isMuted
              ? "bg-slate-100 text-slate-400"
              : "bg-indigo-50 text-indigo-600"
          }`}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className={`h-5 w-5 ${isSpeaking ? "animate-pulse" : ""}`} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              AI Voice Coach
            </h3>
            {isSpeaking && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping" />
                Speaking
              </span>
            )}
          </div>

          <p className="mt-1 text-sm font-medium text-slate-700 leading-relaxed">
            {isLoading ? (
              <span className="text-indigo-600 animate-pulse font-normal">
                Synthesizing real-time coaching cue...
              </span>
            ) : message ? (
              message
            ) : (
              <span className="text-slate-400 font-normal">
                Waiting for exercise movement...
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onReplay && (
          <button
            onClick={onReplay}
            disabled={isLoading}
            title="Replay Voice Cue"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Replay Cue</span>
          </button>
        )}

        {onToggleMute && (
          <button
            onClick={onToggleMute}
            title={isMuted ? "Unmute Voice Coach" : "Mute Voice Coach"}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border transition ${
              isMuted
                ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default VoiceFeedback;


