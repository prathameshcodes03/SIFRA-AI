import { useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import AppShell from "../components/Dashboard/AppShell";
import Camerafeed from "../components/Workout/Camerafeed";
import VoiceFeedback from "../components/Workout/VoiceFeedback";
import { useWorkout } from "../Context/WorkoutContext";
import useVoiceCoach from "../hooks/useVoiceCoach";
import { Dumbbell, ArrowLeft, Layers, Sparkles } from "lucide-react";

const EXERCISE_TIPS = {
  squat: "Keep your knees aligned with your toes and chest upright.",
  pushup: "Keep your body in a straight line and elbows close.",
  plank: "Keep your core tight and hips aligned in a straight line.",
};

const Workout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeWorkout, workouts } = useWorkout();

  const exercise =
    (searchParams.get("exercise") || activeWorkout?.exercise || "squat").toLowerCase();
  const workoutId = searchParams.get("workoutId") || activeWorkout?.id || null;
  const sets = Number(searchParams.get("sets") || activeWorkout?.sets || 3);
  const reps = Number(searchParams.get("reps") || activeWorkout?.reps || 10);

  // Find the current exercise index in the workout plan for auto-advance
  const currentIndex = useMemo(() => {
    if (workoutId) {
      const idx = workouts.findIndex((w) => w.id === workoutId);
      if (idx !== -1) return idx;
    }
    const idx = workouts.findIndex(
      (w) => w.exercise.toLowerCase() === exercise
    );
    return idx !== -1 ? idx : 0;
  }, [workouts, workoutId, exercise]);

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
        {/* Active Exercise Header Card */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold capitalize text-slate-900 sm:text-lg">
                  {exercise}
                </h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  Live Session Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Target: <strong>{sets} Sets</strong> • <strong>{reps} Reps</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/WorkoutPlan")}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Change Plan</span>
            </button>
          </div>
        </div>

        {/* Live Camera Viewport */}
        <Camerafeed
          exercise={exercise}
          workoutId={workoutId}
          sets={sets}
          reps={reps}
          onFormFeedback={handleFormFeedback}
          workoutPlan={workouts}
          currentIndex={currentIndex}
        />

        {/* Real-Time Voice Coach HUD Card */}
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




