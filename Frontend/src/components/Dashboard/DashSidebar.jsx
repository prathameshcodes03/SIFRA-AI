import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Dumbbell,
  CalendarCheck,
  User,
  Activity,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../Context/AuthContext";
import api from "../../api/axios";

const navItems = [
  { label: "Dashboard", to: "/Dashboard", icon: LayoutDashboard },
  { label: "Workout Plan", to: "/WorkoutPlan", icon: CalendarCheck },
  { label: "Live Workout", to: "/Workout", icon: Dumbbell },
  { label: "Profile", to: "/Profile", icon: User },
];

const DashSidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (e) {
      console.error("Logout error:", e);
    }
    await logout();
    navigate("/Login", { replace: true });
  };

  const userInitial = (user?.fullName || "A").trim().charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white shadow-sm transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-6">
          <Link
            to="/Landing_Page"
            className="flex items-center gap-2.5 focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-900">
                SIFRA
              </span>
              <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                AI
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </p>

          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Quick Engine Status Card */}
          <div className="mt-8 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-slate-800">
                AI Coach Active
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              MediaPipe vision + local voice cues ready.
            </p>
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
            <Link
              to="/Profile"
              className="flex items-center gap-2.5 min-w-0"
              onClick={onClose}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm overflow-hidden">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userInitial
                )}
              </div>
              <div className="min-w-0 truncate">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {user?.fullName || "Athlete"}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {user?.email || "Athlete"}
                </p>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              title="Logout"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default DashSidebar;

