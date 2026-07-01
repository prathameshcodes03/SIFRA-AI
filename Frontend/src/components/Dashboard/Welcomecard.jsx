import React from "react";
import { useAuth } from "../../Context/AuthContext";

const Welcomecard = () => {

    const { user } = useAuth();

    const getGreeting = () => {

        const hour = new Date().getHours();

        if (hour < 12) return "Good Morning ";
        if (hour < 17) return "Good Afternoon ";
        if (hour < 21) return "Good Evening ";

        return "Good Night ";
    };

    return (

        <div className="absolute mt-6 ml-8">

            <h1 className="text-3xl font-bold text-white">

                {getGreeting()},

                <span className="bg-gradient-to-r  from-[#34d349] via-[#06b6d4] to-[#3b82f6] bg-clip-text text-transparent">
                    {" "}
                    {user?.fullName || "Athlete"}
                </span>

            </h1>

            <p className="mt-2 text-gray-400 text-sm">

                Ready to crush today's workout?
                Stay consistent, stay strong 

            </p>

        </div>

    );

};

export default Welcomecard;