import React from 'react'
import Dashboard from "../../assets/Images/dashboard.jpg";

const WorkourBanner = () => {
  return (
   <div className='h-[20rem] w-[70rem] ml-70  mt-[-43rem] bg-no-repeat bg-cover bg-center border rounded-2xl  border-violet-400/20'    style={{
                                       backgroundImage: `url(${Dashboard})`,
                                   }}>

        <h1 className='text-2xl text-white font-bold ml-4 mt-12'>Ready for Workout?</h1>
        <p className=' text-gray-400 font-bold ml-4 mt-4'>Ai will analyze your form in real-time <br/> and guide you better.</p>

   </div>
  )
}

export default WorkourBanner
