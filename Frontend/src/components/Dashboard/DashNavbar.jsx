import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import Welcomecard from "./Welcomecard";
import Profile from "../../assets/Images/profileimg.jpg";
import { useAuth } from "../../Context/AuthContext";

const DashNavbar = () => {

    const navigate = useNavigate();

    const { user, logout } = useAuth();

    const [showDropdown, setShowDropdown] = useState(false);

    const dropdownRef = useRef(null);

    useEffect(() => {

        const handleClickOutside = (event) => {

            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setShowDropdown(false);
            }

        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };

    }, []);

    const handleLogout = async (e) => {

        try {
            e.preventDefault()
            await axios.post(
                "http://localhost:3000/api/auth/logout",
                {},
                {
                    withCredentials: true,
                }
            );

        } catch (error) {

            console.log(error);

        }

        logout();

        navigate("/Login", { replace: true });

    };

    return (

        <nav className="flex flex-row flex-wrap justify-evenly gap-8">

            <div className="w-[75rem] h-[7rem] bg-white/5 backdrop-blur-2xl border-b border-white/10 ml-60 mt-4 rounded-2xl">

                <Welcomecard />

                <div className="h-[3rem] w-40 mt-4 ml-[65rem]">

                    <div className="flex flex-row gap-4 flex-wrap">

                        <i className="pt-4 text-2xl text-white font-bold fa-regular fa-bell"></i>

                        <div
                            className="relative"
                            ref={dropdownRef}
                        >

                            <div
                                onClick={() =>
                                    setShowDropdown(!showDropdown)
                                }
                                className="mt-2 border border-violet-400/20 rounded-full  w-10 h-10 cursor-pointer bg-cover bg-center bg-no-repeat hover:ring-2 hover:ring-violet-500 transition-all duration-300"
                                style={{
                                    backgroundImage: `url(${Profile})`,
                                }}
                            />

                            {showDropdown && (

                                <div
                                    className="
                                    absolute
                                    right-0
                                    mt-3
                                    w-60
                                    
                                    rounded-2xl
                                    bg-[#161225]/90
                                    backdrop-blur-xl
                                    border
                                    border-violet-500/20
                                    shadow-[0_10px_40px_rgba(0,0,0,0.4)]
                                    overflow-hidden
                                    z-50
                                    "
                                >

                                    <div className="px-5 py-4 border-b border-white/10">

                                        <h3 className="text-white font-semibold">
                                            {user?.fullName}
                                        </h3>

                                        <p className="text-gray-400 text-sm">
                                            {user?.email}
                                        </p>

                                    </div>


                                  

                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-5 py-3 text-red-400 hover:bg-red-500/10 transition-all duration-300"
                                    >
                                        <i className="fa-solid fa-right-from-bracket mr-2"></i>
                                        Logout
                                    </button>

                                </div>

                            )}

                        </div>

                    </div>

                </div>

            </div>

        </nav>

    );

};

export default DashNavbar;