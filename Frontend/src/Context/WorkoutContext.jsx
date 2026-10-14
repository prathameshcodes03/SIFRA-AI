/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios";

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

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <WorkoutContext.Provider
      value={{
        workouts,
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

