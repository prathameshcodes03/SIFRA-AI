/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const WorkoutContext = createContext();

export const WorkoutProvider = ({ children }) => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkouts = async () => {
    try {
      const res = await axios.get(
        "http://localhost:3000/api/workouts",
        {
          withCredentials: true,
        }
      );

      setWorkouts(res.data.workouts);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const addWorkout = async (exercise, sets, reps) => {
    try {
      await axios.post(
        "http://localhost:3000/api/workouts",
        {
          exercise,
          sets,
          reps,
        },
        {
          withCredentials: true,
        }
      );

      fetchWorkouts();
    } catch (error) {
      console.log(error);
    }
  };

  const deleteWorkout = async (id) => {
    try {
      await axios.delete(
        `http://localhost:3000/api/workouts/${id}`,
        {
          withCredentials: true,
        }
      );

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
