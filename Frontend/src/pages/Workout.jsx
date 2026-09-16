import { useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import AppShell from "../components/Dashboard/AppShell";
import Camerafeed from "../components/Workout/Camerafeed";
import VoiceFeedback from "../components/Workout/VoiceFeedback";
import { useWorkout } from "../Context/WorkoutContext";
import useVoiceCoach from "../hooks/useVoiceCoach";

const EXERCISE_TIPS = {
  squat: "Keep your knees aligned with your toes and chest upright.",
  pushup: "Keep your body in a straight line and elbows close.",
  plank: "Keep your core tight and hips aligned in a straight line.",
};

const Workout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeWorkout } = useWorkout();

  const exercise =
    (searchParams.get("exercise") || activeWorkout?.exercise || "squat").toLowerCase();
  const workoutId = searchParams.get("workoutId") || activeWorkout?.id || null;
  const sets = Number(searchParams.get("sets") || activeWorkout?.sets || 3);
  const reps = Number(searchParams.get("reps") || activeWorkout?.reps || 10);

  const initialTip = useMemo(() => {
    return (
      EXERCISE_TIPS[exercise] ||
      "Focus on controlled movement and proper posture."
    );
  }, [exercise]);

  const {
    currentMessage,
    isSpeaking,
    isLoading,
    isMuted,
    setIsMuted,
    speak,
    stop,
    setCurrentMessage,
  } = useVoiceCoach({ initialMessage: initialTip });

  useEffect(() => {
    setCurrentMessage(initialTip);
  }, [initialTip, setCurrentMessage]);

  const handleReplay = () => {
    speak(currentMessage, { force: true });
  };

  const handleToggleMute = () => {
    if (!isMuted) {
      stop();
    }
    setIsMuted((prev) => !prev);
  };

  const handleFormFeedback = (feedback) => {
    if (feedback?.message) {
      speak(feedback.message);
    }
  };

  return (
    <AppShell footer={<Footer />}>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {/* Active Exercise Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
              <i className="fa-solid fa-dumbbell"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold capitalize text-white">
                  {exercise}
                </h2>
                <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
                  Active
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Target: {sets} Sets • {reps} Reps
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/WorkoutPlan")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              Change Plan
            </button>
          </div>
        </div>

        <Camerafeed
          exercise={exercise}
          workoutId={workoutId}
          sets={sets}
          reps={reps}
          onFormFeedback={handleFormFeedback}
        />

        <VoiceFeedback
          message={currentMessage}
          isSpeaking={isSpeaking}
          isLoading={isLoading}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onReplay={handleReplay}
        />
      </div>
    </AppShell>
  );
};

export default Workout;



