import React from 'react'
import {Link,Navigate,useNavigate} from 'react-router-dom'
import Login from '../pages/Login'





const Navbar = () => {

  const navigate = useNavigate();
  return (
     <div className='h-16 w-full bg-[#131323] border-[rgba(139,92,246,0.2)]'>
      
        <div className='flex justify-evenly pt-4'>
              <h1 className=' pt-[-6rem] text-3xl font-extrabold inline-block  bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text  text-transparent'>Sifra.Ai</h1>



        <Link  to = "/" onClick={() => { document.getElementById("home") ?.scrollIntoView({ behavior: "smooth" });}} className='text-[#9333EA] mt-1'>Home</Link>
          <Link  to = "/" onClick={() => { document.getElementById("features") ?.scrollIntoView({ behavior: "smooth" });}}className='text-[#9333EA] mt-1'>Features</Link>
              <Link  to = "/" onClick={() => { document.getElementById("trainer") ?.scrollIntoView({ behavior: "smooth" });}}className='text-[#9333EA] mt-1'>Trainer</Link>
                <button  onClick={()=>navigate('/Login')}    className='group relative overflow-hidden  rounded-3xl px-[-2rem] mt-[-0.5rem] py-2  font-semibold  text-white backdrop-blur-xl border  border-white/10 bg-gradient-to-r  from-[#6366f1]   to-[#ec4899] transition-all duration-500 hover:scale-105 hover:border-white/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] cursor-pointer h-12 w-36'>Get Started</button>
      </div>
        </div>
  )
}

export default Navbar;
