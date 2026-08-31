import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../api/axios";
import { useAuth } from "../../Context/AuthContext";

import Avatar from "../../assets/Images/defaultavatar.png";

const DashNavbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const [showDropdown, setShowDropdown] =
    useState(false);

  const dropdownRef = useRef(null);

  // ==========================================
  // CLOSE DROPDOWN
  // ==========================================

  useEffect(() => {
    const close = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener(
      "mousedown",
      close
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        close
      );
    };
  }, []);

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );
    }

    await logout();

    navigate("/Login", {
      replace: true,
    });
  };

  // ==========================================
  // PROFILE IMAGE
  // ==========================================

  const profileImage =
    user?.profileImage || Avatar;

  // ==========================================
  // INITIAL
  // ==========================================

  const userInitial = (
    user?.fullName || "A"
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <nav
      className="
        sticky
        top-0
        z-20
        border-b
        border-white/5
        bg-[#05050A]/85
        px-4
        py-3
        backdrop-blur-xl
        sm:px-6
        lg:ml-[15rem]
        lg:px-8
      "
    >
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-[90rem]
          items-center
          justify-between
          rounded-2xl
          border
          border-white/10
          bg-white/5
          px-4
          py-3
          sm:px-6
        "
      >
        {/* LEFT */}

        <div className="min-w-0">
          <p
            className="
              text-xs
              font-medium
              uppercase
              tracking-[0.18em]
              text-violet-300/80
            "
          >
            Your space
          </p>

          <h1
            className="
              truncate
              text-base
              font-bold
              text-white
              sm:text-lg
            "
          >
            Welcome back,{" "}
            {user?.fullName || "Athlete"}
          </h1>
        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-2 sm:gap-4">

          {/* MOBILE MENU */}

          <button
            onClick={onMenuToggle}
            aria-label="Open navigation"
            className="
              grid
              size-10
              place-items-center
              rounded-xl
              border
              border-white/10
              text-white
              transition
              hover:bg-white/10
              lg:hidden
            "
          >
            <i className="fa-solid fa-bars" />
          </button>

          {/* NOTIFICATIONS */}

          <button
            aria-label="Notifications"
            className="
              relative
              grid
              size-10
              place-items-center
              rounded-xl
              text-white
              transition-colors
              hover:bg-white/10
              hover:text-violet-400
            "
          >
            <i className="fa-regular fa-bell text-lg" />

            <span
              className="
                absolute
                right-2
                top-2
                size-2
                rounded-full
                bg-red-500
              "
            />
          </button>

          {/* ACCOUNT */}

          <div
            className="relative"
            ref={dropdownRef}
          >
            <button
              onClick={() =>
                setShowDropdown(
                  (prev) => !prev
                )
              }
              aria-label="Open account menu"
              className="
                grid
                size-10
                overflow-hidden
                rounded-full
                border
                border-violet-400/40
                bg-gradient-to-br
                from-violet-500
                to-cyan-500
                text-sm
                font-bold
                text-white
                transition
                hover:ring-2
                hover:ring-violet-500
              "
            >
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="Profile"
                  className="size-full object-cover"
                />
              ) : (
                userInitial
              )}
            </button>

            {/* DROPDOWN */}

            {showDropdown && (
              <div
                className="
                  absolute
                  right-0
                  z-50
                  mt-3
                  w-60
                  overflow-hidden
                  rounded-2xl
                  border
                  border-violet-500/20
                  bg-[#161225]/95
                  shadow-2xl
                  backdrop-blur-2xl
                "
              >
                {/* USER INFO */}

                <div
                  className="
                    flex
                    items-center
                    gap-3
                    border-b
                    border-white/10
                    px-5
                    py-4
                  "
                >
                  <div
                    className="
                      size-10
                      shrink-0
                      overflow-hidden
                      rounded-full
                      border
                      border-violet-400/40
                      bg-gradient-to-br
                      from-violet-500
                      to-cyan-500
                    "
                  >
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt="Profile"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div
                        className="
                          grid
                          size-full
                          place-items-center
                          text-sm
                          font-bold
                          text-white
                        "
                      >
                        {userInitial}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-white">
                      {user?.fullName ||
                        "Athlete"}
                    </h3>

                    <p className="truncate text-sm text-gray-400">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* PROFILE */}

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate("/Profile");
                  }}
                  className="
                    w-full
                    px-5
                    py-4
                    text-left
                    text-white
                    transition
                    hover:bg-white/5
                  "
                >
                  <i className="fa-regular fa-user mr-3" />
                  Profile
                </button>

                {/* LOGOUT */}

                <button
                  onClick={handleLogout}
                  className="
                    w-full
                    px-5
                    py-4
                    text-left
                    text-red-400
                    transition
                    hover:bg-red-500/10
                  "
                >
                  <i className="fa-solid fa-right-from-bracket mr-3" />
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