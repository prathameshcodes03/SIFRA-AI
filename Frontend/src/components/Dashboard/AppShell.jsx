import { useState } from "react";
import DashNavbar from "./DashNavbar";
import DashSidebar from "./DashSidebar";

const AppShell = ({ children, footer }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAFC] text-slate-900 font-sans">
      <DashSidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex flex-col min-h-screen lg:pl-64">
        <DashNavbar onMenuToggle={() => setMenuOpen((open) => !open)} />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        {footer && <div className="mt-auto">{footer}</div>}
      </div>
    </div>
  );
};

export default AppShell;

