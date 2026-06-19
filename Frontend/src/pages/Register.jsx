import React from 'react'
import Login_Background from '../assets/Images/Login_Background.png'
import { Link } from 'react-router-dom'
import Login from './Login'

const Register = () => {
   return (
      <section
        className="h-screen w-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: `url(${Login_Background})`,
        }}
      >
  
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
  
    
        <div
          className="
          relative z-10
          h-[48rem]
          w-[25rem]
          rounded-3xl
          border border-white/20
          bg-black/20
          backdrop-blur-xl
          shadow-[0_0_50px_rgba(139,92,246,0.25)]
          "
        >
                  <h1
            className="
            mt-8
            text-center
            text-5xl
            font-extrabold
            bg-gradient-to-r
            from-[#f97316]
            via-[#ec4899]
            to-[#8b5cf6]
            bg-clip-text
            text-transparent
            "
          >
            Sifra.AI
          </h1>
         




            



      <div className="relative mt-10">
            <i className="fa-solid fa-user absolute left-12 top-1/2 -translate-y-1/2 text-gray-400"></i>
  
            <input
              type="name"
              placeholder="Full Name "
              className="
              w-[20rem]
              h-14
              ml-8
              rounded-2xl
              bg-white/5
              border
              border-white/20
              backdrop-blur-md
              pl-12
              text-white
              placeholder-gray-400
              outline-none
              transition-all
              duration-300
              focus:border-violet-500
              focus:shadow-[0_0_20px_rgba(139,92,246,0.5)]
              "
            />
          </div>




          <div className="relative mt-10">
            <i className="fa-solid fa-user absolute left-12 top-1/2 -translate-y-1/2 text-gray-400"></i>
  
            <input
              type="email"
              placeholder="Email Address"
              className="
              w-[20rem]
              h-14
              ml-8
              rounded-2xl
              bg-white/5
              border
              border-white/20
              backdrop-blur-md
              pl-12
              text-white
              placeholder-gray-400
              outline-none
              transition-all
              duration-300
              focus:border-violet-500
              focus:shadow-[0_0_20px_rgba(139,92,246,0.5)]
              "
            />
          </div>
  
  
          <div className="relative mt-5">
            <i className="fa-solid fa-lock absolute left-12 top-1/2 -translate-y-1/2 text-gray-400"></i>
  
            <input
              type="password"
              placeholder="Password"
              className="
              w-[20rem]
              h-14
              ml-8
              rounded-2xl
              bg-white/5
              border
              border-white/20
              backdrop-blur-md
              pl-12
              text-white
              placeholder-gray-400
              outline-none
              transition-all
              duration-300
              focus:border-violet-500
              focus:shadow-[0_0_20px_rgba(139,92,246,0.5)]
              "
            />
          </div>



           <div className="relative mt-5">
            <i className="fa-solid fa-calendar absolute left-12 top-1/2 -translate-y-1/2 text-gray-400"></i>
  
            <input
              type="number"
              placeholder="Age"
              className="
              w-[20rem]
              h-14
              ml-8
              rounded-2xl
              bg-white/5
              border
              border-white/20
              backdrop-blur-md
              pl-12
              text-white
              placeholder-gray-400
              outline-none
              transition-all
              duration-300
              focus:border-violet-500
              focus:shadow-[0_0_20px_rgba(139,92,246,0.5)]
              "
            />
          </div>



                   <div className="relative mt-5">
            <i className="fa-solid fa-user absolute left-12 top-1/2 -translate-y-1/2 text-gray-400"></i>
  
            <input
              type="text"
              placeholder="Gender"
              className="
              w-[20rem]
              h-14
              ml-8
              rounded-2xl
              bg-white/5
              border
              border-white/20
              backdrop-blur-md
              pl-12
              text-white
              placeholder-gray-400
              outline-none
              transition-all
              duration-300
              focus:border-violet-500
              focus:shadow-[0_0_20px_rgba(139,92,246,0.5)]
              "
            />
          </div>






                     <div className="relative mt-5">
            <i className="fa-solid fa-calendar absolute left-12 top-1/2 -translate-y-1/2 text-gray-400"></i>
  
            <input
              type="number"
              placeholder="Weight"
              className="
              w-[20rem]
              h-14
              ml-8
              rounded-2xl
              bg-white/5
              border
              border-white/20
              backdrop-blur-md
              pl-12
              text-white
              placeholder-gray-400
              outline-none
              transition-all
              duration-300
              focus:border-violet-500
              focus:shadow-[0_0_20px_rgba(139,92,246,0.5)]
              "
            />
          </div>


          



          

  
  



  
  
    
  
          <button
            className="
            group
            relative
            overflow-hidden
            w-[20rem]
            h-14
            ml-8
            mt-8
            rounded-2xl
            font-semibold
            text-white
            bg-gradient-to-r
            from-violet-600
            via-purple-500
            to-fuchsia-500
            transition-all
            duration-500
            hover:scale-[1.03]
            hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]
            "
          >
            <span className="relative z-10">Create Account</span>
  
            <span
              className="
              absolute
              inset-0
              -translate-x-full
              bg-gradient-to-r
              from-transparent
              via-white/20
              to-transparent
              group-hover:translate-x-full
              transition-all
              duration-1000
              "
            />
          </button>
  
   
  
      
          <div className="mt-8 text-center">
            <span className="text-gray-400">
          Sign in to your Account
            </span>
  
            <Link
              to = "/Login"
              className="
              group
              relative
              ml-2
              text-violet-400
              font-medium
              "
            >
              Login
  
              <span
                className="
                absolute
                left-0
                -bottom-1
                h-[2px]
                w-0
                bg-violet-400
                transition-all
                duration-300
                group-hover:w-full
                "
              ></span>
            </Link>
          </div>
  
          
        </div>
      </section>
    )
}

export default Register
