import React from 'react'
import Footer from '../components/Footer';
import DashSidebar from '../components/Dashboard/DashSidebar'
import DashNavbar from '../components/Dashboard/DashNavbar'
import Exercises from '../components/Workout/Exercises';
import TodayWorkout from '../components/Dashboard/TodayWorkout'
import { useState,useEffect } from "react";
import axios from 'axios';

const WorkoutPlan= () => {

  const [workouts, setWorkouts] = useState([]);

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
  }
};
  return (
      <section className='h-full w-screen bg-[#05050A]'>
            <DashNavbar/>
        <DashSidebar/>

 <Exercises
    workouts={workouts}
    fetchWorkouts={fetchWorkouts}
/>

<TodayWorkout workouts={workouts} />

        <div className='mt-[30rem]'>
           <Footer/>
         </div>


        </section>
  )
}

export default WorkoutPlan;
