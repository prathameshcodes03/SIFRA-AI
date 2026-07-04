import React from 'react'
import Footer from '../components/Footer';
import DashSidebar from '../components/Dashboard/DashSidebar'
import DashNavbar from '../components/Dashboard/DashNavbar'

const Setting = () => {
  return (
    <section className='h-full w-screen bg-[#05050A]'>
            <DashNavbar/>
        <DashSidebar/>


        <div className='mt-[10rem]'>
           <Footer/>
         </div>

        </section>
  )
}

export default Setting
