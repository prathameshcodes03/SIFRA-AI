import React from 'react'
import DashSidebar from '../components/Dashboard/DashSidebar'
import DashNavbar from '../components/Dashboard/DashNavbar'
import WorkourBanner from '../components/Dashboard/WorkourBanner'
import AccuracyCard from '../components/Dashboard/AccuracyCard'
import WorkoutStreak from '../components/Dashboard/WorkoutStreak'
import TodayWorkout from '../components/Dashboard/TodayWorkout'
import Footer from '../components/Footer';

const Dashboard = () => {
  return (
    <section className='h-full w-screen bg-[#05050A]'>
            <DashNavbar/>
        <DashSidebar/>

        <WorkourBanner/>
        <AccuracyCard/>
        <WorkoutStreak/>
          <TodayWorkout/>

         <div className='mt-[10rem]'>
           <Footer/>
         </div>
  









      
    </section>
  )
}

export default Dashboard
