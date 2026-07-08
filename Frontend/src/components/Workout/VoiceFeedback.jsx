import React, { useState } from "react";

const VoiceFeedback = () => {

  const [isSpeaking, setIsSpeaking] = useState(true);

  const [message, setMessage] = useState("Keep your back straight.");

  return (
    <div
      className="
      w-[60rem]
      h-15
      ml-[20rem]
      mt-4
      rounded-2xl
      border border-white/10
      bg-[#11111B]
      px-6
      flex
      items-center
      justify-between
      "
    >
      <div>
        <h2 className="text-white text-lg font-semibold">
          AI Voice Coach
        </h2>

        <p className="text-sm text-gray-400">
          {isSpeaking ? message : "Waiting..."}
        </p>
      </div>

      <div
        className={`
        h-12
        w-12
        rounded-full
        bg-gradient-to-r
        from-violet-600
        to-purple-600
        flex
        items-center
        justify-center
        ${isSpeaking ? "animate-pulse" : ""}
        `}
      >
        <i
          className={`fa-solid ${
            isSpeaking ? "fa-volume-high" : "fa-volume-xmark"
          } text-white text-xl`}
        ></i>
      </div>
    </div>
  );
};

export default VoiceFeedback;