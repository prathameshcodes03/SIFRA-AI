import React from 'react'
import {Link,useNavigate} from 'react-router-dom'





const Navbar = () => {

  const navigate = useNavigate();
  return (
     <div className='w-full bg-[#131323] border-[rgba(139,92,246,0.2)]'>
      
        <div className='mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:px-8'>
              <h1 className='shrink-0 text-2xl font-extrabold inline-block bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-transparent sm:text-3xl'>Sifra.Ai</h1>



        <div className='order-3 flex w-full items-center justify-center gap-4 text-sm sm:order-none sm:w-auto sm:gap-6 sm:text-base'>
        <Link  to = "/" onClick={() => { document.getElementById("home") ?.scrollIntoView({ behavior: "smooth" });}} className='text-[#9333EA]'>Home</Link>
          <Link  to = "/" onClick={() => { document.getElementById("features") ?.scrollIntoView({ behavior: "smooth" });}}className='text-[#9333EA]'>Features</Link>
              <Link  to = "/" onClick={() => { document.getElementById("trainer") ?.scrollIntoView({ behavior: "smooth" });}}className='text-[#9333EA]'>Trainer</Link>
        </div>
                <button  onClick={()=>navigate('/Login')}    className='group relative h-11 w-32 cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#6366f1] to-[#ec4899] px-4 py-2 font-semibold text-white backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:border-white/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] sm:h-12 sm:w-36'>Get Started</button>
      </div>
        </div>
  )
}

export default Navbar;
