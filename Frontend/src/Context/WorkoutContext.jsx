/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import api from "../api/axios";
import { selectPlanWorkouts } from "../exercises/workoutPlan";

const WorkoutContext = createContext();

export const WorkoutProvider = ({ children }) => {
  const [workouts, setWorkouts] = useState([]);
  const [stats, setStats] = useState({
    accuracy: null,
    hasAccuracyData: false,
    totalPredictions: 0,
    correctPredictions: 0,
    currentStreak: 0,
    bestStreak: 0,
    completedDays: 0,
    weeklyGoal: 7,
    totalCompleted: 0,
  });
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/workouts/stats");
      if (res.data?.success && res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (error) {
      console.error("FETCH STATS ERROR:", error);
    }
  }, []);

  const fetchWorkouts = useCallback(async () => {
    try {
      const res = await api.get("/api/workouts");
      if (res.data?.workouts) {
        setWorkouts(res.data.workouts);
      }
    } catch (error) {
      console.error("FETCH WORKOUTS ERROR:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchWorkouts(), fetchStats()]);
  }, [fetchWorkouts, fetchStats]);

  const addWorkout = async (exercise, sets, reps) => {
    try {
      await api.post("/api/workouts", {
        exercise,
        sets,
        reps,
      });

      await refreshAll();
    } catch (error) {
      console.error("ADD WORKOUT ERROR:", error);
    }
  };

  const completeWorkout = async ({
    workoutId,
    exercise,
    sets,
    reps,
    accuracy,
    totalPredictions = 0,
    correctPredictions = 0,
  }) => {
    try {
      const endpoint = workoutId
        ? `/api/workouts/${workoutId}/complete`
        : "/api/workouts/complete";
      const res = await api.post(endpoint, {
        workoutId,
        exercise,
        sets,
        reps,
        accuracy,
        totalPredictions,
        correctPredictions,
      });

      await refreshAll();
      return res.data;
    } catch (error) {
      console.error("COMPLETE WORKOUT ERROR:", error);
      throw error;
    }
  };

  const deleteWorkout = async (id) => {
    try {
      await api.delete(`/api/workouts/${id}`);
      await refreshAll();
    } catch (error) {
      console.error("DELETE WORKOUT ERROR:", error);
    }
  };
  /**
   * The PLAN: the exercises that are still outstanding, plus the ones that
   * were completed today.
   *
   * The plan builder and the queue used to list EVERY workout the user has
   * ever created. That was actively harmful: yesterday's finished workouts
   * sat in the list looking like plan entries, and removing them (the trash
   * button) deleted the RECORD of those workouts - which is exactly what the
   * streak is built from. A user tidying up their plan silently lost their
   * history, and the streak went down with it.
   *
   * The plan is a plan, not a history. Yesterday's finished workouts are
   * history now, and the history is not editable from the plan.
   */
  const planWorkouts = useMemo(() => selectPlanWorkouts(workouts), [workouts]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  /**
   * Keep the Dashboard numbers honest when the user comes back to the tab.
   *
   * A workout can be completed in another tab, or the device can sleep through
   * the completion, so the stats are re-read whenever the page becomes
   * visible again instead of being frozen at mount time.
   */
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        fetchStats();
      }
    };

    window.addEventListener("focus", handleVisible);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      window.removeEventListener("focus", handleVisible);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [fetchStats]);

  return (
    <WorkoutContext.Provider
      value={{
        workouts,
        planWorkouts,
        stats,
        activeWorkout,
        setActiveWorkout,
        loading,
        fetchWorkouts,
        fetchStats,
        refreshAll,
        addWorkout,
        completeWorkout,
        deleteWorkout,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => useContext(WorkoutContext);

