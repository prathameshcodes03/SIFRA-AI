import React from "react";

const AccuracyCard = ({ accuracy = 0 }) => {

    return (

        <div
            className="
            w-[20rem]
            h-[18rem]
            rounded-3xl
            bg-white/5
            backdrop-blur-xl
            border
            border-white/10
            shadow-[0_0_30px_rgba(139,92,246,0.15)]
            p-6
            ml-[18rem]
            mt-8
            "
        >

            <h2 className="text-white text-xl font-bold">
                Workout Accuracy
            </h2>

            <p className="text-gray-400 text-sm mt-1">
                AI Posture Detection
            </p>

            <div className="flex justify-center mt-8">

                <div
                    className="
                    relative
                    w-36
                    h-36
                    rounded-full
                    bg-gradient-to-br
                    from-violet-600
                    via-fuchsia-500
                    to-pink-500
                    flex
                    items-center
                    justify-center
                    shadow-[0_0_25px_rgba(168,85,247,0.4)]
                    "
                >

                    <div
                        className="
                        w-28
                        h-28
                        rounded-full
                        bg-[#0f0f18]
                        flex
                        items-center
                        justify-center
                        "
                    >

                        <div className="text-center">

                            <h1 className="text-4xl font-bold text-white">
                                {accuracy}%
                            </h1>

                            <p className="text-xs text-gray-400">
                                Accuracy
                            </p>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

};

export default AccuracyCard;