/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const WorkoutContext = createContext();

export const WorkoutProvider = ({ children }) => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkouts = async () => {
    try {
      const res = await api.get("/api/workouts");

      setWorkouts(res.data.workouts);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const addWorkout = async (exercise, sets, reps) => {
    try {
      await api.post(
        "/api/workouts",
        {
          exercise,
          sets,
          reps,
        }
      );

      fetchWorkouts();
    } catch (error) {
      console.log(error);
    }
  };

  const deleteWorkout = async (id) => {
    try {
      await api.delete(`/api/workouts/${id}`);

      fetchWorkouts();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  return (
    <WorkoutContext.Provider
      value={{
        workouts,
        loading,
        fetchWorkouts,
        addWorkout,
        deleteWorkout,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => useContext(WorkoutContext);
