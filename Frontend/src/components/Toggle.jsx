import React from "react";

const Toggle = ({ on, setOn }) => {
  return (
    <button
      onClick={() => setOn(!on)}
      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${
        on ? "bg-purple-600 justify-end" : "bg-white/15 justify-start"
      }`}
    >
      <span className="w-5 h-5 bg-white rounded-full"></span>
    </button>
  );
};

export default Toggle;
