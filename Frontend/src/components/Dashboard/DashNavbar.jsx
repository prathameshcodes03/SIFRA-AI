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
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        try {
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
        <nav className="w-full px-8 pt-6  ">
            <div className="w-[65rem] ml-[15.5rem]  max-w-7xl mx-auto h-24 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl px-8 flex items-center justify-between">
                
                {/* Welcome Card */}
                <Welcomecard />

                {/* Right Section */}
                <div className="flex items-center gap-6">
                    {/* Notification */}
                    <button className="relative ml-[55rem] text-white hover:text-violet-400 transition-colors duration-300">
                        <i className="fa-regular fa-bell text-2xl"></i>

                        {/* Notification Dot */}
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                    </button>

                    {/* Profile */}
                    <div className="relative" ref={dropdownRef}>
                        <div
                            onClick={() =>
                                setShowDropdown((prev) => !prev)
                            }
                            className="w-12 h-12 rounded-full border border-violet-500/30 bg-cover bg-center cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all duration-300"
                            style={{
                                backgroundImage: `url(${Profile})`,
                            }}
                        />

                        {showDropdown && (
                            <div
                                className="
                                absolute
                                right-0
                                mt-4
                                w-64
                                rounded-2xl
                                bg-[#161225]/95
                                backdrop-blur-2xl
                                border
                                border-violet-500/20
                                shadow-2xl
                                overflow-hidden
                                z-50
                                "
                            >
                                {/* User Info */}
                                <div className="px-5 py-4 border-b border-white/10">
                                    <h3 className="text-white font-semibold text-lg">
                                        {user?.fullName}
                                    </h3>

                                    <p className="text-gray-400 text-sm truncate">
                                        {user?.email}
                                    </p>
                                </div>

                                {/* Menu */}
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left  px-5 py-4 text-red-400 hover:bg-red-500/10 transition-all duration-300"
                                >
                                    <i className="fa-solid fa-right-from-bracket mr-3"></i>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default DashNavbar;