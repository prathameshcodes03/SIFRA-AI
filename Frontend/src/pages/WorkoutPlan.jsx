import React from 'react'
import Footer from '../components/Footer';
import DashSidebar from '../components/Dashboard/DashSidebar'
import DashNavbar from '../components/Dashboard/DashNavbar'
import Exercises from '../components/Workout/Exercises';

const Progress = () => {
  return (
      <section className='h-full w-screen bg-[#05050A]'>
            <DashNavbar/>
        <DashSidebar/>

        <Exercises/>

        <div className='mt-[30rem]'>
           <Footer/>
         </div>


        </section>
  )
}

export default Progress
