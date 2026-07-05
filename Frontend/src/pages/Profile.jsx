import React from 'react'
import {UserRound, CalendarDays, Mail, VenusAndMars, MapPin, Goal} from 'lucide-react'
import Footer from '../components/Footer';
import DashSidebar from '../components/Dashboard/DashSidebar'
import DashNavbar from '../components/Dashboard/DashNavbar'

const Profile = () => {
  return (
    <section className='h-full w-screen bg-[#05050A]'>

          
      <DashNavbar/>
        

      <div className='fixed z-10'>
        <DashSidebar />
      </div>
     

      <div className='w-[calc(100%-15rem)] ml-[15rem] py-2'>

        <div className='flex  mx-[2.7rem] bg-[#2A194F] rounded-lg mt-4'>

          <div className='my-2 mx-4'>
            <img src="https://i.pinimg.com/736x/c6/29/b7/c629b7a6697803a29bf9ae45e5e3be13.jpg" className='rounded-full h-60 w-60 border-2 border-purple-500' />
          </div>

          <div className='mt-10 ml-4 text-white'>
            <h3 className='text-2xl font-extrabold'>Nimish kapoor</h3>
            <h4 className='pt-4'>nimishkapoor@gmail.com</h4>

            <p className='pt-25'>Stay consistent and strong, You've got this  💪</p>
          </div>

        </div>

        <div className='mx-[2.7rem] bg-[#2A194F] rounded-lg mt-2 px-8 text-white space-y-5 py-3'>
          
          <div className='flex justify-between font-extrabold border-b border-white/30'>
            <h2 className='text-lg'>Personal Information</h2>
            <h4>Edit Profile</h4>
          </div>

          <div className='flex justify-between border-b border-white/30 '>
            <h4 className='flex gap-2 pb-1 '><UserRound /> Full Name</h4>
            <p>Nimish Kapoor</p>
          </div>

          <div className='flex justify-between border-b border-white/30'>
            <h4 className='flex gap-2 pb-1 '><Mail /> Email</h4>
            <p>nimishkapoor@gmail.com</p>
          </div>

          <div className='flex justify-between border-b border-white/30'>
            <h4 className='flex gap-2 pb-1 '><CalendarDays /> Date of birth</h4>
            <p>2/8/2002</p>
          </div>

          <div className='flex justify-between border-b border-white/30'>
            <h4 className='flex gap-2 pb-1'> <VenusAndMars />Gender</h4>
            <p>male</p>
          </div>

          <div className='flex justify-between border-b border-white/30'>
            <h4 className='flex gap-2 pb-1 '> <MapPin /> Location</h4>
            <p>Mumbai, Maharashtra</p>
          </div>

          <div className='flex justify-between'>
            <h4 className='flex gap-2 pb-1 '> <Goal />Fitness Goal</h4>
            <p>Increase Strngth</p>
          </div>

        </div>

      </div>

      <div className='w-[calc(100%-15rem)] ml-[15rem] -pt-2'>
          <Footer/>
      </div>

    </section>
  )
}

export default Profile
