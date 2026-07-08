import React from 'react'
import Dashboard from "../../assets/Images/dashboard.jpg";
import { useNavigate } from 'react-router-dom';
import Workout from '../../pages/Workout';

const WorkourBanner = () => {

  const navigate = useNavigate();


  return (
   <div className='h-[20rem] w-[70rem] ml-70  mt-[-43rem] bg-no-repeat bg-cover bg-center border rounded-2xl  border-violet-400/20'    style={{
                                       backgroundImage: `url(${Dashboard})`,
                                   }}>

        <h1 className='text-2xl text-white font-bold ml-4 mt-12'>Ready for Workout?</h1>
        <p className=' text-gray-400 font-bold ml-4 mt-4'>Ai will analyze your form in real-time <br/> and guide you better.</p>


      <button onClick={()=>navigate("/Workout")} className='w-40 h-16 text-xl text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl cursor-pointer mt-12 ml-4 hover:from-violet-700 hover:to-purple-700 transition-colors duration-300'>Start Workout</button>

   </div>
  )
}

export default WorkourBanner
