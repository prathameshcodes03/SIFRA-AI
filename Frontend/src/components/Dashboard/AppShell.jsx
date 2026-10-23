import { useState } from "react";
import DashNavbar from "./DashNavbar";
import DashSidebar from "./DashSidebar";

const AppShell = ({ children, footer }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAFC] text-slate-900 font-sans">
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <DashSidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex flex-col min-h-screen lg:pl-64">
        <DashNavbar onMenuToggle={() => setMenuOpen((open) => !open)} />
        <main id="dashboard-main" className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        {footer && <div className="mt-auto">{footer}</div>}
      </div>
    </div>
  );
};

export default AppShell;

