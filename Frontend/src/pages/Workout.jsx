import React from 'react'
import Footer from '../components/Footer';
import DashSidebar from '../components/Dashboard/DashSidebar'
import DashNavbar from '../components/Dashboard/DashNavbar'
import Exercises from '../components/Workout/Exercises';
import Camerafeed from '../components/Workout/Camerafeed';
import VoiceFeedback from '../components/Workout/VoiceFeedback';


const Workout = () => {
  return (
     <section className='h-full w-screen bg-[#05050A]'>
            <DashNavbar/>
        <DashSidebar/>

      <Camerafeed/>

      <VoiceFeedback/>

    

        <div className='mt-[10rem]'>
           <Footer/>
         </div>

        </section>
  )
}

export default Workout
