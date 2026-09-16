import React from "react";

const VoiceFeedback = ({
  message = "AI Voice Coach is ready. Keep your back straight.",
  isSpeaking = false,
  isLoading = false,
  isMuted = false,
  onToggleMute,
  onReplay,
}) => {
  return (
    <div
      className="
      min-h-20
      w-full
      rounded-2xl
      border border-white/10
      bg-[#11111B]
      px-6
      py-4
      flex
      flex-wrap
      items-center
      justify-between
      gap-3
      shadow-[0_0_25px_rgba(139,92,246,0.12)]
      "
    >
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <h2 className="text-white text-lg font-semibold">AI Voice Coach</h2>
          {isSpeaking && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
          )}
        </div>

        <p className="text-sm text-gray-300 mt-1 transition-all duration-300">
          {isLoading ? (
            <span className="text-violet-400 animate-pulse">Generating voice tip...</span>
          ) : message ? (
            message
          ) : (
            <span className="text-gray-500">Waiting for exercise start...</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {onReplay && (
          <button
            onClick={onReplay}
            disabled={isLoading}
            title="Hear coaching tip"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300 text-xs font-semibold hover:bg-violet-500/20 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <i className="fa-solid fa-volume-high text-xs"></i>
            <span>Speak Tip</span>
          </button>
        )}

        {onToggleMute && (
          <button
            onClick={onToggleMute}
            title={isMuted ? "Unmute Voice Coach" : "Mute Voice Coach"}
            className={`h-9 w-9 rounded-xl border flex items-center justify-center text-xs transition-all duration-200 ${
              isMuted
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            <i
              className={`fa-solid ${
                isMuted ? "fa-volume-xmark" : "fa-volume-high"
              }`}
            ></i>
          </button>
        )}

        <div
          className={`
          h-12
          w-12
          rounded-full
          bg-gradient-to-r
          from-violet-600
          to-purple-600
          flex
          items-center
          justify-center
          shadow-[0_0_15px_rgba(139,92,246,0.35)]
          transition-all
          duration-300
          ${isSpeaking ? "scale-110 animate-pulse shadow-[0_0_25px_rgba(168,85,247,0.6)]" : ""}
          `}
        >
          <i
            className={`fa-solid ${
              isSpeaking
                ? "fa-waveform-lines text-white"
                : isMuted
                ? "fa-volume-xmark text-white/60"
                : "fa-volume-high text-white"
            } text-lg`}
          ></i>
        </div>
      </div>
    </div>
  );
};

export default VoiceFeedback;

