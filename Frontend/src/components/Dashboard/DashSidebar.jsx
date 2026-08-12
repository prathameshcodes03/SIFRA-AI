import { NavLink } from "react-router-dom";

const navItems = [
  ["Dashboard", "/Dashboard", "fa-regular fa-house"],
  ["Workout", "/Workout", "fa-solid fa-dumbbell"],
  ["Workout plan", "/WorkoutPlan", "fa-solid fa-calendar-check"],
  ["Profile", "/Profile", "fa-regular fa-user"],
  ["Settings", "/Setting", "fa-solid fa-gear"],
];

const DashSidebar = ({ isOpen, onClose }) => (
  <>
    <button onClick={onClose} aria-label="Close navigation" className={`fixed inset-0 z-30 bg-black/60 transition-opacity lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} />
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-violet-400/15 bg-gradient-to-b from-[#08070f] via-[#0b0818] to-[#1a0d35] px-4 py-7 shadow-2xl transition-transform duration-300 lg:translate-x-0 ${isOpen ? "translate-x-0" : ""}`}>
      <div className="mb-10">
        <h1 className="bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-3xl font-extrabold text-transparent">Sifra.AI</h1>
        <p className="mt-1 bg-gradient-to-r from-[#34d399] via-[#06b6d4] to-[#3b82f6] bg-clip-text text-sm text-transparent">AI fitness coach</p>
      </div>
      <nav aria-label="Dashboard navigation" className="space-y-2">
        {navItems.map(([label, to, icon]) => <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl border px-4 font-semibold transition ${isActive ? "border-violet-400 bg-violet-600/30 shadow-[0_0_20px_rgba(168,85,247,0.25)]" : "border-violet-400/15 bg-violet-500/10 hover:bg-violet-500/20"}`}><i aria-hidden="true" className={`${icon} w-5 text-lg`} />{label}</NavLink>)}
      </nav>
    </aside>
  </>
);

export default DashSidebar;
