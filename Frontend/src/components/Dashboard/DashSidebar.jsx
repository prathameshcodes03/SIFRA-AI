import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DashSidebar = () => {

  const navigate = useNavigate();

  const [active, setActive] = useState("Dashboard");

  const handleNavigation = (page) => {
    setActive(page);

    switch (page) {
      case "Dashboard":
        navigate("/Dashboard");
        break;

      case "Workout":
        navigate("/Workout");
        break;

      case "Progress":
        navigate("/Progress");
        break;

      case "Profile":
        navigate("/Profile");
        break;

      case "Setting":
        navigate("/Setting");
        break;

      default:
        navigate("/Dashboard");
    }
  };

  return (

    <aside className='mt-[-8rem] h-screen w-60 bg-gradient-to-b from-[#08070f] via-[#0b0818] to-[#1a0d35]'>

      <div className='flex flex-col justify-between flex-wrap'>

        <div className='mt-4 ml-4'>

          <div>
            <h1 className='pt-[-6rem] text-3xl font-extrabold inline-block bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-transparent'>
              Sifra.Ai
            </h1>

            <br />

            <p className='text-sm inline-block bg-gradient-to-r from-[#34d399] via-[#06b6d4] to-[#3b82f6] bg-clip-text text-transparent'>
              Ai fitness coach
            </p>

          </div>

     



          <div
            onClick={() => handleNavigation("Dashboard")}
            className={`flex items-center gap-2 mt-4 h-16 rounded-xl border cursor-pointer transition-all duration-300
            ${
              active === "Dashboard"
                ? "bg-violet-600/30 border-violet-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
                : "bg-violet-500/15 border border-violet-400/20 hover:bg-violet-500/25 hover:scale-[1.02]"
            }`}
          >
            <h3>
              <i className="ml-8 text-white text-2xl fa-regular fa-house"></i>
            </h3>

            <span className='pt-[2rem] mt-[-2rem] text-1xl font-extrabold text-white cursor-pointer'>
              Dashboard
            </span>
          </div>





       
          <div
            onClick={() => handleNavigation("Workout")}
            className={`flex items-center gap-2 mt-4 h-16 rounded-xl border cursor-pointer transition-all duration-300
            ${
              active === "Workout"
                ? "bg-violet-600/30 border-violet-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
                : "bg-violet-500/15 border border-violet-400/20 hover:bg-violet-500/25 hover:scale-[1.02]"
            }`}
          >
            <h3>
              <i className="ml-8 text-white text-2xl fa-solid fa-dumbbell"></i>
            </h3>

            <span className='pt-[2rem] mt-[-2rem] text-1xl font-extrabold text-white cursor-pointer'>
              Workout
            </span>
          </div>





       
          <div
            onClick={() => handleNavigation("Progress")}
            className={`flex items-center gap-2 mt-4 h-16 rounded-xl border cursor-pointer transition-all duration-300
            ${
              active === "Progress"
                ? "bg-violet-600/30 border-violet-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
                : "bg-violet-500/15 border border-violet-400/20 hover:bg-violet-500/25 hover:scale-[1.02]"
            }`}
          >
            <h3>
              <i className="ml-8 text-white text-2xl fa-solid fa-arrow-trend-down"></i>
            </h3>

            <span className='pt-[2rem] mt-[-2rem] text-1xl font-extrabold text-white cursor-pointer'>
              Progress
            </span>
          </div>





       
          <div
            onClick={() => handleNavigation("Profile")}
            className={`flex items-center gap-2 mt-4 h-16 rounded-xl border cursor-pointer transition-all duration-300
            ${
              active === "Profile"
                ? "bg-violet-600/30 border-violet-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
                : "bg-violet-500/15 border border-violet-400/20 hover:bg-violet-500/25 hover:scale-[1.02]"
            }`}
          >
            <h3>
              <i className="ml-8 text-white text-2xl fa-regular fa-user"></i>
            </h3>

            <span className='pt-[2rem] mt-[-2rem] text-1xl font-extrabold text-white cursor-pointer'>
              Profile
            </span>
          </div>






        
          <div
            onClick={() => handleNavigation("Setting")}
            className={`flex items-center gap-2 mt-4 h-16 rounded-xl border cursor-pointer transition-all duration-300
            ${
              active === "Setting"
                ? "bg-violet-600/30 border-violet-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
                : "bg-violet-500/15 border border-violet-400/20 hover:bg-violet-500/25 hover:scale-[1.02]"
            }`}
          >
            <h3>
              <i className="ml-8 text-white text-2xl fa-solid fa-gear"></i>
            </h3>

            <span className='pt-[2rem] mt-[-2rem] text-1xl font-extrabold text-white cursor-pointer'>
              Setting
            </span>
          </div>

        </div>






      </div>

    </aside>

  );
};

export default DashSidebar;