import React, { useState } from "react";
import Webcam from "react-webcam";

const Camerafeed = () => {

  const [cameraOn, setCameraOn] = useState(true);

  const videoConstraints = {
    facingMode: "user",
    width: 1280,
    height: 720,
  };

  const handleEndWorkout = () => {
    setCameraOn(false);
  };

  const handleRestart = () => {

    setCameraOn(true);

};

  return (
    <div className="relative h-[35rem] w-[65rem] bg-[#11111B] rounded-2xl mt-[-43rem] ml-[20rem] overflow-hidden">

      {cameraOn ? (
        <Webcam
          audio={false}
          videoConstraints={videoConstraints}
          screenshotFormat="image/jpeg"
          className="w-full h-full object-cover"
        />
      ) : (

    <div className="flex flex-col items-center justify-center h-full">

        <i className="fa-solid fa-video-slash text-6xl text-red-500"></i>

        <button

            onClick={handleRestart}

            className="mt-8 h-14 w-48 rounded-2xl

            bg-gradient-to-r from-violet-600 to-purple-600

            text-white hover:scale-105 duration-300"

        >

            Restart Camera

        </button>

    </div>
      )}

      {cameraOn && (
        <button
          onClick={handleEndWorkout}
          className="
          absolute
          bottom-8
          right-8
          w-40
          h-16
          text-xl
          text-white
          bg-gradient-to-r
          from-rose-500
          to-red-500
          transition-all
          duration-300
          hover:from-rose-600
          hover:to-red-600
          hover:scale-[1.02]
          hover:shadow-[0_0_30px_rgba(244,63,94,0.45)]
          active:scale-[0.98]
          rounded-2xl
          cursor-pointer
          "
        >
          End Workout
        </button>
      )}

    </div>
  );
};

export default Camerafeed;