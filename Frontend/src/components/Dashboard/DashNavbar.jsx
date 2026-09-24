import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import api from "../../api/axios";
import {
  Menu,
  Bell,
  User,
  LogOut,
  Dumbbell,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import Avatar from "../../assets/Images/defaultavatar.png";

const DashNavbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
    }
    await logout();
    navigate("/Login", { replace: true });
  };

  const userInitial = (user?.fullName || "A").trim().charAt(0).toUpperCase();

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        {/* Left: Mobile Toggle & Page Context */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            aria-label="Open navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
              Training Workspace
            </p>
            <h1 className="text-sm font-bold text-slate-900 sm:text-base">
              Welcome back, {user?.fullName || "Athlete"}
            </h1>
          </div>
        </div>

        {/* Right: Quick Action & Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/Workout")}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            <Dumbbell className="h-3.5 w-3.5" />
            <span>Quick Workout</span>
          </button>

          {/* Account Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown((prev) => !prev)}
              aria-label="Open user menu"
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 transition hover:bg-slate-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white overflow-hidden">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userInitial
                )}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 mr-1 hidden sm:block" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {user?.fullName || "Athlete"}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {user?.email || "athlete@sifra.ai"}
                  </p>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/Profile");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>Profile & Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/WorkoutPlan");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Dumbbell className="h-3.5 w-3.5 text-slate-400" />
                    <span>Workout Plan</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 p-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashNavbar;